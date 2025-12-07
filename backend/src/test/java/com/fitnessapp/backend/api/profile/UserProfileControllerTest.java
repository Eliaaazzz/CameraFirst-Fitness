package com.fitnessapp.backend.api.profile;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.user.entity.Allergen;
import com.fitnessapp.backend.user.entity.DietaryPreference;
import com.fitnessapp.backend.user.entity.FitnessGoal;
import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.controller.UserProfileController;
import com.fitnessapp.backend.user.dto.UserProfileRequest;
import com.fitnessapp.backend.recipe.service.SmartRecipeService;
import com.fitnessapp.backend.user.service.UserProfileService;
import com.fitnessapp.backend.workout.service.LeaderboardService;
import com.fitnessapp.backend.nutrition.service.NutritionInsightService;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserProfileController.class)
@AutoConfigureMockMvc(addFilters = false)
class UserProfileControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private ObjectMapper objectMapper;

  @MockBean
  private UserProfileService userProfileService;

  @MockBean
  private SmartRecipeService smartRecipeService;

  @MockBean
  private LeaderboardService leaderboardService;

  @MockBean
  private NutritionInsightService nutritionInsightService;

  private static UserProfile sampleProfile(UUID userId) {
    User user = User.builder().id(userId).email("foo@example.com").timeBucket(1).level("BEGINNER").dietTilt("BALANCED").build();
    UserProfile profile = new UserProfile();
    profile.setUserId(userId);
    profile.setUser(user);
    profile.setHeightCm(180);
    profile.setWeightKg(78.0);
    profile.setBmi(24.07);
    profile.setFitnessGoal(FitnessGoal.GAIN_MUSCLE);
    profile.setDietaryPreference(DietaryPreference.NONE);
    profile.setDailyCalorieTarget(2600);
    profile.setDailyProteinTarget(180);
    profile.setDailyCarbsTarget(250);
    profile.setDailyFatTarget(70);
    profile.setAllergens(Set.of(Allergen.NUTS));
    profile.setCreatedAt(OffsetDateTime.parse("2025-11-04T05:00:00Z"));
    profile.setUpdatedAt(OffsetDateTime.parse("2025-11-04T05:00:00Z"));
    return profile;
  }

  @Test
  void getProfileReturnsProfile() throws Exception {
    UUID userId = UUID.randomUUID();
    UserProfile profile = sampleProfile(userId);
    when(userProfileService.getProfile(userId)).thenReturn(Optional.of(profile));

    mockMvc.perform(get("/api/v1/users/{userId}/profile", userId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.userId").value(userId.toString()))
        .andExpect(jsonPath("$.heightCm").value(180))
        .andExpect(jsonPath("$.fitnessGoal").value("GAIN_MUSCLE"));
  }

  @Test
  void getProfileReturns404WhenMissing() throws Exception {
    UUID userId = UUID.randomUUID();
    when(userProfileService.getProfile(userId)).thenReturn(Optional.empty());

    mockMvc.perform(get("/api/v1/users/{userId}/profile", userId))
        .andExpect(status().isNotFound());
  }

  @Test
  void putProfileUpserts() throws Exception {
    UUID userId = UUID.randomUUID();
    UserProfile profile = sampleProfile(userId);
    when(userProfileService.upsertProfile(eq(userId), any(UserProfile.class))).thenReturn(profile);

    UserProfileRequest request = new UserProfileRequest(180, 78.0, 18.5, 1600, FitnessGoal.GAIN_MUSCLE,
        DietaryPreference.NONE, Set.of(Allergen.NUTS), 2600, 180, 250, 70);

    mockMvc.perform(put("/api/v1/users/{userId}/profile", userId)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.bmi").value(24.07));

    verify(userProfileService).upsertProfile(eq(userId), any(UserProfile.class));
    verify(smartRecipeService).evictCache(userId);
  }

  @Test
  void deleteProfileRemovesRecord() throws Exception {
    UUID userId = UUID.randomUUID();

    mockMvc.perform(delete("/api/v1/users/{userId}/profile", userId))
        .andExpect(status().isNoContent());

    verify(userProfileService).deleteProfile(userId);
    verify(smartRecipeService).evictCache(userId);
  }
}
