package com.fitnessapp.backend.user.controller;

import com.fitnessapp.backend.user.dto.UserProfileMapper;
import com.fitnessapp.backend.user.dto.UserProfileRequest;
import com.fitnessapp.backend.user.dto.UserProfileResponse;
import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.recipe.service.SmartRecipeService;
import com.fitnessapp.backend.user.repository.UserRepository;
import com.fitnessapp.backend.security.CurrentUser;
import com.fitnessapp.backend.nutrition.service.core.NutritionInsightService;
import com.fitnessapp.backend.user.service.UserProfileService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
@Validated
@RequiredArgsConstructor
public class CurrentUserController {

  private final CurrentUser currentUser;
  private final UserRepository userRepository;
  private final UserProfileService userProfileService;
  private final SmartRecipeService smartRecipeService;
  private final NutritionInsightService nutritionInsightService;

  @GetMapping
  public ResponseEntity<MeResponse> currentUser() {
    UUID userId = currentUser.get()
        .map(com.fitnessapp.backend.security.AuthenticatedUser::userId)
        // Dev-friendly fallback: allow default-user when no API key is provided
        .orElse(UUID.fromString("00000000-0000-0000-0000-000000000001"));
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
    Optional<UserProfile> profile = userProfileService.getProfile(userId);
    profile.ifPresent(p -> p.getAllergens().size()); // initialize lazy collection for serialization
    return ResponseEntity.ok(new MeResponse(
        userId,
        user.getEmail(),
        user.getLevel(),
        user.getTimeBucket(),
        profile.map(UserProfileMapper::toResponse).orElse(null)
    ));
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

  public record MeResponse(
      UUID userId,
      String email,
      String level,
      Integer timeBucket,
      UserProfileResponse profile
  ) {}
}
