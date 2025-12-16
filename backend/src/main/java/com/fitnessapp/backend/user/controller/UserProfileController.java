package com.fitnessapp.backend.user.controller;

import com.fitnessapp.backend.user.dto.UserProfileMapper;
import com.fitnessapp.backend.user.dto.UserProfileRequest;
import com.fitnessapp.backend.user.dto.UserProfileResponse;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.recipe.service.SmartRecipeService;
import com.fitnessapp.backend.nutrition.service.core.NutritionInsightService;
import com.fitnessapp.backend.user.service.UserProfileService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users/{userId}/profile")
@RequiredArgsConstructor
@Validated
public class UserProfileController {

  private final UserProfileService userProfileService;
  private final SmartRecipeService smartRecipeService;
  private final NutritionInsightService nutritionInsightService;

  @GetMapping
  public ResponseEntity<UserProfileResponse> getProfile(@PathVariable UUID userId) {
    Optional<UserProfile> profile = userProfileService.getProfile(userId);
    return profile
        .map(p -> ResponseEntity.ok(UserProfileMapper.toResponse(p)))
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  @PutMapping
  public ResponseEntity<UserProfileResponse> upsertProfile(
      @PathVariable UUID userId,
      @Valid @RequestBody UserProfileRequest request) {
    UserProfile payload = UserProfileMapper.toEntity(request);
    UserProfile saved = userProfileService.upsertProfile(userId, payload);
    smartRecipeService.evictCache(userId);
    nutritionInsightService.invalidate(userId);
    return ResponseEntity.ok(UserProfileMapper.toResponse(saved));
  }

  @DeleteMapping
  public ResponseEntity<Void> deleteProfile(@PathVariable UUID userId) {
    userProfileService.deleteProfile(userId);
    smartRecipeService.evictCache(userId);
    nutritionInsightService.invalidate(userId);
    return ResponseEntity.noContent().build();
  }

  @ExceptionHandler(EntityNotFoundException.class)
  ResponseEntity<Void> handleNotFound(EntityNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
  }

}
