package com.fitnessapp.backend.api.profile;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
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
import com.fitnessapp.backend.security.CurrentUser;
import com.fitnessapp.backend.user.controller.CurrentUserController;
import com.fitnessapp.backend.user.dto.UserProfileRequest;
import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.repository.UserRepository;
import com.fitnessapp.backend.user.service.UserProfileService;
import com.fitnessapp.backend.user.service.UserService;

@ExtendWith(MockitoExtension.class)
class CurrentUserControllerTest {

  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @Mock
  private CurrentUser currentUser;

  @Mock
  private UserRepository userRepository;

  @Mock
  private UserProfileService userProfileService;

  @Mock
  private UserService userService;

  @Mock
  private SmartRecipeService smartRecipeService;

  @Mock
  private NutritionInsightService nutritionInsightService;

  @BeforeEach
  void setUp() {
    objectMapper = new ObjectMapper();
    objectMapper.findAndRegisterModules();
    CurrentUserController controller = new CurrentUserController(currentUser, userRepository, userProfileService, userService, smartRecipeService, nutritionInsightService);
    mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
  }

  @Test
  void returnsCurrentUserWithProfile() throws Exception {
    UUID userId = UUID.randomUUID();
    when(currentUser.requireUserId()).thenReturn(userId);
    when(userRepository.findById(userId)).thenReturn(Optional.of(
        User.builder().id(userId).email("user@example.com").level("INTERMEDIATE").timeBucket(2).build()));
    when(userProfileService.getProfile(userId)).thenReturn(Optional.of(UserProfile.builder()
        .userId(userId)
        .heightCm(172)
        .weightKg(new BigDecimal("70.0"))
        .build()));

    mockMvc.perform(get("/api/v1/me"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.userId").value(userId.toString()))
        .andExpect(jsonPath("$.profile.heightCm").value(172));
  }

  @Test
  void updatesProfileForCurrentUser() throws Exception {
    UUID userId = UUID.randomUUID();
    when(currentUser.requireUserId()).thenReturn(userId);
    when(userProfileService.upsertProfile(any(), any())).thenAnswer(invocation -> {
      UserProfile payload = invocation.getArgument(1, UserProfile.class);
      payload.setUserId(userId);
      return payload;
    });

  UserProfileRequest request = new UserProfileRequest(180, new BigDecimal("80.0"), null, null, null, null, null, 2200, 160, 220, 70);

    mockMvc.perform(put("/api/v1/me/profile")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.userId").value(userId.toString()))
        .andExpect(jsonPath("$.heightCm").value(180));

    verify(userProfileService).upsertProfile(any(), any());
    verify(smartRecipeService).evictCache(userId);
    verify(nutritionInsightService).invalidate(userId);
  }

  @Test
  void deletesProfileForCurrentUser() throws Exception {
    UUID userId = UUID.randomUUID();
    when(currentUser.requireUserId()).thenReturn(userId);

    mockMvc.perform(delete("/api/v1/me/profile"))
        .andExpect(status().isNoContent());

    verify(userProfileService).deleteProfile(userId);
    verify(smartRecipeService).evictCache(userId);
    verify(nutritionInsightService).invalidate(userId);
  }
}