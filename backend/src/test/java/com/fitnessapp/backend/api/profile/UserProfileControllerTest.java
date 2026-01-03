package com.fitnessapp.backend.api.profile;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.nutrition.service.core.NutritionInsightService;
import com.fitnessapp.backend.recipe.service.SmartRecipeService;
import com.fitnessapp.backend.user.controller.UserProfileController;
import com.fitnessapp.backend.user.dto.UserProfileRequest;
import com.fitnessapp.backend.user.entity.DietaryPreference;
import com.fitnessapp.backend.user.entity.FitnessGoal;
import com.fitnessapp.backend.user.entity.HealthMode;
import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.service.UserProfileService;

@ExtendWith(MockitoExtension.class)
class UserProfileControllerTest {

  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @Mock
  private UserProfileService userProfileService;

  @Mock
  private SmartRecipeService smartRecipeService;

  @Mock
  private NutritionInsightService nutritionInsightService;

  @BeforeEach
  void setUp() {
    objectMapper = new ObjectMapper();
    objectMapper.findAndRegisterModules();
    UserProfileController controller = new UserProfileController(userProfileService, smartRecipeService, nutritionInsightService);
    mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
  }

  private static UserProfile sampleProfile(UUID userId) {
    User user = User.builder().id(userId).email("foo@example.com").timeBucket(1).level("BEGINNER").dietTilt("BALANCED").build();
    UserProfile profile = new UserProfile();
    profile.setUserId(userId);
    profile.setUser(user);
    profile.setHeightCm(180);
    profile.setWeightKg(new BigDecimal("78.0"));
    profile.setBmi(new BigDecimal("24.07"));
    profile.setFitnessGoal(FitnessGoal.GAIN_MUSCLE);
    profile.setDietaryPreference(DietaryPreference.NONE);
    profile.setDailyCalorieTarget(2600);
    profile.setDailyProteinTarget(180);
    profile.setDailyCarbsTarget(250);
    profile.setDailyFatTarget(70);
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

  UserProfileRequest request = new UserProfileRequest(180, new BigDecimal("78.0"), new BigDecimal("18.5"), 1600, FitnessGoal.GAIN_MUSCLE,
    DietaryPreference.NONE, HealthMode.PREVENTION, 2600, 180, 250, 70);

    mockMvc.perform(put("/api/v1/users/{userId}/profile", userId)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.bmi").value(24.07));

    verify(userProfileService).upsertProfile(eq(userId), any(UserProfile.class));
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
