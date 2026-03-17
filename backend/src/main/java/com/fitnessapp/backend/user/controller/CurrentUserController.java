package com.fitnessapp.backend.user.controller;

import java.util.Optional;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fitnessapp.backend.nutrition.service.core.NutritionInsightService;
import com.fitnessapp.backend.recipe.service.SmartRecipeService;
import com.fitnessapp.backend.security.CurrentUser;
import com.fitnessapp.backend.user.dto.StreakUpdateResult;
import com.fitnessapp.backend.user.dto.UserProfileMapper;
import com.fitnessapp.backend.user.dto.UserProfileRequest;
import com.fitnessapp.backend.user.dto.UserProfileResponse;
import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.repository.UserRepository;
import com.fitnessapp.backend.user.service.UserProfileService;
import com.fitnessapp.backend.user.service.UserService;

import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/me")
@Validated
@RequiredArgsConstructor
public class CurrentUserController {

  private final CurrentUser currentUser;
  private final UserRepository userRepository;
  private final UserProfileService userProfileService;
  private final UserService userService;
  private final SmartRecipeService smartRecipeService;
  private final NutritionInsightService nutritionInsightService;

  @GetMapping
  public ResponseEntity<MeResponse> currentUser(
      @RequestHeader(value = "X-User-Timezone", required = false) String userTimezone) {
    UUID userId = currentUser.requireUserId();
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
    Optional<UserProfile> profile = userProfileService.getProfile(userId);

    // Validate streak (lazy reset if expired) using user's timezone for accurate day calculation
    int validatedStreak = userService.validateAndGetStreak(userId, userTimezone);

    // Derive display name from username or email prefix
    String displayName = user.getUsername();
    if (displayName == null || displayName.isBlank()) {
      displayName = user.getEmail().split("@")[0];
    }

    return ResponseEntity.ok(new MeResponse(
        userId,
        user.getEmail(),
        displayName,
        validatedStreak,
        user.getLevel(),
        user.getTimeBucket(),
        profile.map(UserProfileMapper::toResponse).orElse(null),
        user.getAuthProvider() != null ? user.getAuthProvider().name() : null,
        user.getAppleUserId()
    ));
  }

  /**
   * Records user activity and updates streak.
   * Call this endpoint when user completes a meaningful action (e.g., post, workout).
   *
   * @return StreakUpdateResult with current streak and whether it was incremented
   */
  @PostMapping("/streak")
  public ResponseEntity<StreakUpdateResult> recordActivity() {
    UUID userId = currentUser.requireUserId();
    StreakUpdateResult result = userService.updateStreak(userId);
    return ResponseEntity.ok(result);
  }

  @GetMapping("/profile")
  public ResponseEntity<UserProfileResponse> getProfile() {
    UUID userId = currentUser.requireUserId();
    return userProfileService.getProfile(userId)
        .map(UserProfileMapper::toResponse)
        .map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  @PutMapping("/profile")
  public ResponseEntity<UserProfileResponse> upsertProfile(@Valid @RequestBody UserProfileRequest request) {
    UUID userId = currentUser.requireUserId();
    UserProfile payload = UserProfileMapper.toEntity(request);
    UserProfile saved = userProfileService.upsertProfile(userId, payload);
    smartRecipeService.evictCache(userId);
    nutritionInsightService.invalidate(userId);
    return ResponseEntity.ok(UserProfileMapper.toResponse(saved));
  }

  @DeleteMapping("/profile")
  public ResponseEntity<Void> deleteProfile() {
    UUID userId = currentUser.requireUserId();
    userProfileService.deleteProfile(userId);
    smartRecipeService.evictCache(userId);
    nutritionInsightService.invalidate(userId);
    return ResponseEntity.noContent().build();
  }

  @PutMapping("/username")
  public ResponseEntity<MeResponse> updateUsername(@Valid @RequestBody UpdateUsernameRequest request) {
    UUID userId = currentUser.requireUserId();
    User user = userService.updateUsername(userId, request.username());
    Optional<UserProfile> profile = userProfileService.getProfile(userId);

    String displayName = user.getUsername();
    if (displayName == null || displayName.isBlank()) {
      displayName = user.getEmail().split("@")[0];
    }

    return ResponseEntity.ok(new MeResponse(
        userId,
        user.getEmail(),
        displayName,
        user.getCurrentStreak(),
        user.getLevel(),
        user.getTimeBucket(),
        profile.map(UserProfileMapper::toResponse).orElse(null),
        user.getAuthProvider() != null ? user.getAuthProvider().name() : null,
        user.getAppleUserId()
    ));
  }

  /**
   * Permanently deletes the current user's account and all associated data.
   * This operation cannot be undone.
   */
  @DeleteMapping
  public ResponseEntity<Void> deleteAccount() {
    UUID userId = currentUser.requireUserId();
    userService.deleteUser(userId);
    smartRecipeService.evictCache(userId);
    nutritionInsightService.invalidate(userId);
    return ResponseEntity.noContent().build();
  }

  public record UpdateUsernameRequest(String username) {}

  public record MeResponse(
      UUID userId,
      String email,
      String username,
      Integer currentStreak,
      String level,
      Integer timeBucket,
      UserProfileResponse profile,
      String authProvider,
      String appleUserId
  ) {}
}
