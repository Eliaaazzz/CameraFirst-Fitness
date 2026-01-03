package com.fitnessapp.backend.user.dto;

import com.fitnessapp.backend.user.entity.UserProfile;

public final class UserProfileMapper {

  private UserProfileMapper() {}

  public static UserProfile toEntity(UserProfileRequest request) {
    UserProfile profile = new UserProfile();
    profile.setHeightCm(request.heightCm());
    profile.setWeightKg(request.weightKg());
    profile.setBodyFatPercentage(request.bodyFatPercentage());
    profile.setBasalMetabolicRate(request.basalMetabolicRate());
    profile.setFitnessGoal(request.fitnessGoal());
    profile.setDietaryPreference(request.dietaryPreference());
    profile.setHealthMode(request.healthMode());
    profile.setDailyCalorieTarget(request.dailyCalorieTarget());
    profile.setDailyProteinTarget(request.dailyProteinTarget());
    profile.setDailyCarbsTarget(request.dailyCarbsTarget());
    profile.setDailyFatTarget(request.dailyFatTarget());
    return profile;
  }

  public static UserProfileResponse toResponse(UserProfile profile) {
    return new UserProfileResponse(
        profile.getUserId(),
        profile.getHeightCm(),
        profile.getWeightKg(),
        profile.getBmi(),
        profile.getBodyFatPercentage(),
        profile.getBasalMetabolicRate(),
        profile.getFitnessGoal(),
        profile.getDietaryPreference(),
        profile.getHealthMode(),
        profile.getDailyCalorieTarget(),
        profile.getDailyProteinTarget(),
        profile.getDailyCarbsTarget(),
        profile.getDailyFatTarget(),
        profile.getAvatarUrl(),
        profile.getCreatedAt(),
        profile.getUpdatedAt());
  }
}
