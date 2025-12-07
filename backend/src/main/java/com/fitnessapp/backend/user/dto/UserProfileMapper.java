package com.fitnessapp.backend.user.dto;

import com.fitnessapp.backend.user.entity.Allergen;
import com.fitnessapp.backend.user.entity.UserProfile;
import java.util.HashSet;
import java.util.Set;

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
    profile.setDailyCalorieTarget(request.dailyCalorieTarget());
    profile.setDailyProteinTarget(request.dailyProteinTarget());
    profile.setDailyCarbsTarget(request.dailyCarbsTarget());
    profile.setDailyFatTarget(request.dailyFatTarget());

    Set<Allergen> allergens = request.allergens() != null
        ? new HashSet<>(request.allergens())
        : new HashSet<>();
    profile.setAllergens(allergens);
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
        profile.getAllergens(),
        profile.getDailyCalorieTarget(),
        profile.getDailyProteinTarget(),
        profile.getDailyCarbsTarget(),
        profile.getDailyFatTarget(),
        profile.getCreatedAt(),
        profile.getUpdatedAt());
  }
}
