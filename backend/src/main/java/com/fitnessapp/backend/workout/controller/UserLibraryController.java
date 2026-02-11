package com.fitnessapp.backend.workout.controller;

import com.fitnessapp.backend.api.common.ApiEnvelope;
import com.fitnessapp.backend.security.AuthenticatedUser;
import com.fitnessapp.backend.security.CurrentUser;
import com.fitnessapp.backend.workout.service.UserLibraryService;
import com.fitnessapp.backend.workout.service.UserLibraryService.PageResult;
import com.fitnessapp.backend.workout.service.UserLibraryService.SavedRecipe;
import com.fitnessapp.backend.workout.service.UserLibraryService.SavedWorkout;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Slf4j
public class UserLibraryController {

  static final CacheControl USER_SAVED_ITEMS_CACHE =
      CacheControl.maxAge(1, TimeUnit.MINUTES).cachePrivate();

  private final UserLibraryService libraryService;
  private final CurrentUser currentUser;

  @PostMapping("/workouts/save")
  public ApiEnvelope<SavedWorkout> saveWorkout(@Valid @RequestBody SaveWorkoutRequest request) {
    UUID userId = resolveUserId(request.userId());
    log.trace("API request: save workout {} for user {}", request.workoutId(), userId);
    SavedWorkout saved = libraryService.saveWorkout(userId, request.workoutId());
    return ApiEnvelope.of(saved);
  }

  @GetMapping("/workouts/saved")
  public ResponseEntity<ApiEnvelope<PageResult<SavedWorkout>>> savedWorkouts(
      @RequestParam(required = false) UUID userId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(required = false) String sort) {
    UUID effectiveUserId = resolveUserId(userId);
    Sort sortSpec = resolveSort(sort, ResourceType.WORKOUT);
    log.trace("API request: list saved workouts for user {} (page={}, size={}, sort={})",
        effectiveUserId, page, size, sortSpec);
    PageResult<SavedWorkout> workouts = libraryService.getSavedWorkouts(effectiveUserId, page, size, sortSpec);
    return ResponseEntity.ok()
        .cacheControl(USER_SAVED_ITEMS_CACHE)
        .body(ApiEnvelope.of(workouts));
  }

  @DeleteMapping("/workouts/saved/{workoutId}")
  public ApiEnvelope<OperationResponse> removeWorkout(@PathVariable UUID workoutId,
                                                      @RequestParam(required = false) UUID userId) {
    UUID effectiveUserId = resolveUserId(userId);
    boolean removed = libraryService.removeWorkout(effectiveUserId, workoutId);
    return ApiEnvelope.of(new OperationResponse(removed));
  }

  @PostMapping("/recipes/save")
  public ApiEnvelope<SavedRecipe> saveRecipe(@Valid @RequestBody SaveRecipeRequest request) {
    UUID userId = resolveUserId(request.userId());
    log.trace("API request: save recipe {} for user {}", request.recipeId(), userId);
    SavedRecipe saved = libraryService.saveRecipe(userId, request.recipeId());
    return ApiEnvelope.of(saved);
  }

  @GetMapping("/recipes/saved")
  public ResponseEntity<ApiEnvelope<PageResult<SavedRecipe>>> savedRecipes(
      @RequestParam(required = false) UUID userId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(required = false) String sort) {
    UUID effectiveUserId = resolveUserId(userId);
    Sort sortSpec = resolveSort(sort, ResourceType.RECIPE);
    log.trace("API request: list saved recipes for user {} (page={}, size={}, sort={})",
        effectiveUserId, page, size, sortSpec);
    PageResult<SavedRecipe> recipes = libraryService.getSavedRecipes(effectiveUserId, page, size, sortSpec);
    return ResponseEntity.ok()
        .cacheControl(USER_SAVED_ITEMS_CACHE)
        .body(ApiEnvelope.of(recipes));
  }

  @DeleteMapping("/recipes/saved/{recipeId}")
  public ApiEnvelope<OperationResponse> removeRecipe(@PathVariable UUID recipeId,
                                                     @RequestParam(required = false) UUID userId) {
    UUID effectiveUserId = resolveUserId(userId);
    boolean removed = libraryService.removeRecipe(effectiveUserId, recipeId);
    return ApiEnvelope.of(new OperationResponse(removed));
  }

  private UUID resolveUserId(UUID requestUserId) {
    UUID authenticatedId = currentUser.get().map(AuthenticatedUser::userId).orElse(null);
    if (requestUserId == null) {
      if (authenticatedId == null) {
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing authenticated user context");
      }
      return authenticatedId;
    }
    if (authenticatedId != null && !authenticatedId.equals(requestUserId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "userId does not match authenticated principal");
    }
    return requestUserId;
  }

  public record SaveWorkoutRequest(@NotNull UUID workoutId, UUID userId) {}

  public record SaveRecipeRequest(@NotNull UUID recipeId, UUID userId) {}

  public record OperationResponse(boolean success) {}

  private Sort resolveSort(String sort, ResourceType resourceType) {
    List<String> tokens = sort == null ? List.of() : Arrays.stream(sort.split(","))
        .map(String::trim)
        .filter(token -> !token.isEmpty())
        .toList();

    Sort.Direction direction = Sort.Direction.DESC;
    List<String> fields = new ArrayList<>();

    for (String token : tokens) {
      if (token.equalsIgnoreCase("asc") || token.equalsIgnoreCase("desc")) {
        direction = Sort.Direction.fromString(token);
      } else {
        fields.add(mapSortField(token, resourceType));
      }
    }

    if (fields.isEmpty()) {
      fields.add(mapSortField("savedAt", resourceType));
    }

    if (resourceType == ResourceType.WORKOUT && fields.stream().noneMatch(field -> field.equals("savedAt"))) {
      fields.add(mapSortField("savedAt", resourceType));
    }

    if (resourceType == ResourceType.RECIPE && fields.stream().noneMatch(field -> field.equals("savedAt"))) {
      fields.add(mapSortField("savedAt", resourceType));
    }

    Sort sortSpec = Sort.by(direction, fields.get(0));
    for (int i = 1; i < fields.size(); i++) {
      sortSpec = sortSpec.and(Sort.by(direction, fields.get(i)));
    }
    return sortSpec;
  }

  private String mapSortField(String token, ResourceType resourceType) {
    return switch (resourceType) {
      case WORKOUT -> mapWorkoutField(token);
      case RECIPE -> mapRecipeField(token);
    };
  }

  private String mapWorkoutField(String token) {
    return switch (token.toLowerCase()) {
      case "savedat", "saved_at", "saved" -> "savedAt";
      // exercise_videos does not store duration; approximate via is_short (1 min vs 5 min on the frontend).
      case "duration", "durationminutes" -> "workout.isShort";
      case "title", "name" -> "workout.exerciseName";
      default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported sort field for workouts: " + token);
    };
  }

  private String mapRecipeField(String token) {
    return switch (token.toLowerCase()) {
      case "savedat", "saved_at", "saved" -> "savedAt";
      case "time", "timeminutes", "duration" -> "recipe.timeMinutes";
      case "difficulty" -> "recipe.difficulty";
      default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported sort field for recipes: " + token);
    };
  }

  private enum ResourceType {
    WORKOUT,
    RECIPE
  }
}
