package com.fitnessapp.backend.user.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitnessapp.backend.user.dto.UserProfileMapper;
import com.fitnessapp.backend.user.dto.UserProfileResponse;
import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.user.repository.UserRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserProfileService {

  private final UserProfileRepository userProfileRepository;
  private final UserRepository userRepository;

  @Transactional
  public UserProfile upsertProfile(UUID userId, UserProfile payload) {
    UserProfile profile = getOrCreateProfile(userId);
    profile.apply(payload);
    computeDerivedMetrics(profile);
    return userProfileRepository.save(profile);
  }

  @Transactional(readOnly = true)
  public Optional<UserProfile> getProfile(UUID userId) {
    return userProfileRepository.findByUserId(userId);
  }

  /**
   * Gets the existing profile or creates a new one if it doesn't exist.
   * This is the single source of truth for UserProfile creation.
   */
  @Transactional
  public UserProfile getOrCreateProfile(UUID userId) {
    return userProfileRepository.findById(userId)
        .orElseGet(() -> {
          User user = userRepository.findById(userId)
              .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
          UserProfile created = new UserProfile();
          created.setUser(user);
          return userProfileRepository.save(created);
        });
  }

  @Transactional
  public void deleteProfile(UUID userId) {
    userProfileRepository.deleteById(userId);
  }

  @Transactional
  public UserProfile save(UserProfile profile) {
    log.info("UserProfileService.save called for user: {}, avatarUrl: {}, avatarFileKey: {}", 
        profile.getUserId(), profile.getAvatarUrl(), profile.getAvatarFileKey());
    computeDerivedMetrics(profile);
    UserProfile saved = userProfileRepository.save(profile);
    log.info("UserProfileService.save completed, saved avatarUrl: {}, avatarFileKey: {}", 
        saved.getAvatarUrl(), saved.getAvatarFileKey());
    return saved;
  }

  /**
   * Updates avatar and returns the response DTO within the same transaction.
   */
  @Transactional
  public AvatarUpdateResponseResult updateAvatarAndGetResponse(UUID userId, String url, String key) {
    UserProfile profile = getOrCreateProfile(userId);
    String oldKey = profile.getAvatarFileKey();
    profile.setAvatarUrl(url);
    profile.setAvatarFileKey(key);
    UserProfile saved = save(profile);
    // Map to DTO while still in transaction so lazy collections can be loaded
    UserProfileResponse response = UserProfileMapper.toResponse(saved);
    return new AvatarUpdateResponseResult(response, oldKey);
  }

  public record AvatarUpdateResponseResult(UserProfileResponse response, String oldFileKey) {}

  private void computeDerivedMetrics(UserProfile profile) {
    Integer heightCm = profile.getHeightCm();
    BigDecimal weightKg = profile.getWeightKg();

    if (heightCm == null || heightCm <= 0 || weightKg == null || weightKg.compareTo(BigDecimal.ZERO) <= 0) {
      profile.setBmi(null);
      return;
    }

    // Convert height from cm to meters using BigDecimal for precision
    BigDecimal heightMeters = BigDecimal.valueOf(heightCm).divide(
        BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);

    // Calculate BMI = weight / (height^2)
    BigDecimal heightSquared = heightMeters.multiply(heightMeters);
    BigDecimal bmiValue = weightKg.divide(heightSquared, 2, RoundingMode.HALF_UP);

    profile.setBmi(bmiValue);
  }
}