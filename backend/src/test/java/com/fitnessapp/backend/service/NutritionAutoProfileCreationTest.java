package com.fitnessapp.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.user.repository.UserRepository;
import com.fitnessapp.backend.nutrition.service.NutritionTrackingService.NutritionSummary;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

/**
 * Integration test to verify that nutrition APIs auto-create default profiles
 * when they don't exist, preventing 500 errors.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
@DisplayName("Nutrition Auto Profile Creation Test")
class NutritionAutoProfileCreationTest {

  @Autowired
  private NutritionTrackingService nutritionTrackingService;

  @Autowired
  private UserRepository userRepository;

  @Autowired
  private UserProfileRepository userProfileRepository;

  @Autowired
  private MealLogRepository mealLogRepository;

  private User testUser;

  @BeforeEach
  void setUp() {
    // Clean database
    mealLogRepository.deleteAll();
    userProfileRepository.deleteAll();
    userRepository.deleteAll();

    // Create a user WITHOUT a profile
    testUser = User.builder()
        .email("no-profile@test.com")
        .timeBucket(20)
        .level("beginner")
        .dietTilt("balanced")
        .build();
    testUser = userRepository.save(testUser);
    
    // Verify no profile exists
    assertThat(userProfileRepository.findByUserId(testUser.getId())).isEmpty();
  }

  @Test
  @DisplayName("Daily summary auto-creates profile when missing")
  void dailySummaryAutoCreatesProfile() {
    // Call the daily summary without having a profile
    NutritionSummary summary = nutritionTrackingService.dailySummary(
        testUser.getId(), 
        LocalDate.now()
    );

    // Verify the summary was returned successfully
    assertThat(summary).isNotNull();
    assertThat(summary.days()).isEqualTo(1);
    assertThat(summary.calories().target()).isEqualTo(2000); // Default target
    assertThat(summary.protein().target()).isEqualTo(130);   // Default target
    
    // Verify a profile was auto-created
    UserProfile createdProfile = userProfileRepository.findByUserId(testUser.getId())
        .orElse(null);
    assertThat(createdProfile).isNotNull();
    assertThat(createdProfile.getDailyCalorieTarget()).isEqualTo(2000);
    assertThat(createdProfile.getDailyProteinTarget()).isEqualTo(130);
    assertThat(createdProfile.getDailyCarbsTarget()).isEqualTo(220);
    assertThat(createdProfile.getDailyFatTarget()).isEqualTo(70);
  }

  @Test
  @DisplayName("Weekly summary auto-creates profile when missing")
  void weeklySummaryAutoCreatesProfile() {
    // Call the weekly summary without having a profile
    NutritionSummary summary = nutritionTrackingService.weeklySummary(
        testUser.getId(), 
        LocalDate.now().with(java.time.DayOfWeek.MONDAY)
    );

    // Verify the summary was returned successfully
    assertThat(summary).isNotNull();
    assertThat(summary.days()).isEqualTo(7);
    assertThat(summary.calories().target()).isEqualTo(2000 * 7); // Default target * 7 days
    
    // Verify a profile was auto-created
    UserProfile createdProfile = userProfileRepository.findByUserId(testUser.getId())
        .orElse(null);
    assertThat(createdProfile).isNotNull();
  }
}
