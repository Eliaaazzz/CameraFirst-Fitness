package com.fitnessapp.backend.user.service;

import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserProfileService {

  private final UserProfileRepository userProfileRepository;
  private final UserRepository userRepository;

  @Transactional
  public UserProfile upsertProfile(UUID userId, UserProfile payload) {
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

    UserProfile profile = userProfileRepository.findById(userId)
        .orElseGet(() -> {
          UserProfile created = new UserProfile();
          created.setUserId(userId);
          created.setUser(user);
          return created;
        });

    profile.setUser(user);
    profile.apply(payload);
    computeDerivedMetrics(profile);
    return userProfileRepository.save(profile);
  }

  @Transactional(readOnly = true)
  public Optional<UserProfile> getProfile(UUID userId) {
    return userProfileRepository.findByUserId(userId);
  }

  @Transactional
  public void deleteProfile(UUID userId) {
    userProfileRepository.deleteById(userId);
  }

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

