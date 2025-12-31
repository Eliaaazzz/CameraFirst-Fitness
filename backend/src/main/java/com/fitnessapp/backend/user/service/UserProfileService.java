package com.fitnessapp.backend.user.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
   * Updates the avatar URL and file key for a user profile in a single transaction.
   * This ensures the entity remains managed throughout the operation, preventing
   * detached entity issues.
   * 
   * @return the updated profile along with the old file key (if any) for cleanup
   */
  @Transactional
  public AvatarUpdateResult updateAvatar(UUID userId, String avatarUrl, String avatarFileKey) {
    log.info("UserProfileService.updateAvatar called for user: {}, avatarUrl: {}, avatarFileKey: {}", 
        userId, avatarUrl, avatarFileKey);
    
    UserProfile profile = getOrCreateProfile(userId);
    String oldFileKey = profile.getAvatarFileKey();
    
    profile.setAvatarUrl(avatarUrl);
    profile.setAvatarFileKey(avatarFileKey);
    
    // No need to call computeDerivedMetrics since we're only updating avatar fields
    // and the profile is already managed within this transaction
    UserProfile saved = userProfileRepository.save(profile);
    
    log.info("UserProfileService.updateAvatar completed, saved avatarUrl: {}, avatarFileKey: {}, oldFileKey: {}", 
        saved.getAvatarUrl(), saved.getAvatarFileKey(), oldFileKey);
    return new AvatarUpdateResult(saved, oldFileKey);
  }

  /**
   * Result of avatar update operation, including the old file key for cleanup.
   */
  public record AvatarUpdateResult(UserProfile profile, String oldFileKey) {}

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