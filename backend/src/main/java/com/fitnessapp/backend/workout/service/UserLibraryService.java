package com.fitnessapp.backend.workout.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitnessapp.backend.recipe.entity.Recipe;
import com.fitnessapp.backend.recipe.entity.UserSavedRecipe;
import com.fitnessapp.backend.recipe.repository.RecipeRepository;
import com.fitnessapp.backend.recipe.repository.UserSavedRecipeRepository;
import com.fitnessapp.backend.user.repository.UserRepository;
import com.fitnessapp.backend.workout.entity.ExerciseVideo;
import com.fitnessapp.backend.workout.entity.UserSavedWorkout;
import com.fitnessapp.backend.workout.repository.ExerciseVideoRepository;
import com.fitnessapp.backend.workout.repository.UserSavedWorkoutRepository;

import io.micrometer.core.instrument.MeterRegistry;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserLibraryService {

  private static final int DEFAULT_PAGE_SIZE = 20;
  private static final int MAX_PAGE_SIZE = 100;

  private final UserRepository userRepository;
  private final ExerciseVideoRepository exerciseVideoRepository;
  private final RecipeRepository recipeRepository;
  private final UserSavedWorkoutRepository savedWorkoutRepository;
  private final UserSavedRecipeRepository savedRecipeRepository;
  private final MeterRegistry meterRegistry;

  @Transactional
  public SavedWorkout saveWorkout(UUID userId, UUID workoutId) {
    long startTime = System.nanoTime();
    log.trace("saveWorkout: userId={}, workoutId={}", userId, workoutId);
    
    userRepository.findById(userId)
        .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
    ExerciseVideo workout = exerciseVideoRepository.findById(workoutId)
        .orElseThrow(() -> new EntityNotFoundException("Workout not found: " + workoutId));

    UserSavedWorkout.Id id = new UserSavedWorkout.Id(userId, workoutId);
    log.debug("Attempting to save workout {} for user {}", workoutId, userId);
    var existing = savedWorkoutRepository.findById(id);
    UserSavedWorkout persisted;
    boolean alreadySaved;
    if (existing.isPresent()) {
      persisted = existing.get();
      alreadySaved = true;
      log.debug("Workout {} already saved for user {} at {}", workoutId, userId, persisted.getSavedAt());
    } else {
      UserSavedWorkout created = new UserSavedWorkout();
      created.setId(id);
      created.setUser(userRepository.getReferenceById(userId));
      created.setWorkout(workout);
      savedWorkoutRepository.save(created);
      persisted = savedWorkoutRepository.findById(id)
          .orElseThrow(() -> new IllegalStateException("Saved workout missing immediately after persist: " + id));
      alreadySaved = false;
    }
    
    long duration = System.nanoTime() - startTime;
    log.info("Workout {} saved for user {} (alreadySaved={}, durationMs={})", 
        workoutId, userId, alreadySaved, duration / 1_000_000);
    meterRegistry.counter("user.library.save", "type", "workout", "alreadySaved", Boolean.toString(alreadySaved)).increment();
    meterRegistry.timer("user.library.save.duration", "type", "workout").record(duration, java.util.concurrent.TimeUnit.NANOSECONDS);
    
    return toSavedWorkout(persisted.getWorkout(), persisted.getSavedAt(), alreadySaved);
  }

  @Transactional
  public boolean removeWorkout(UUID userId, UUID workoutId) {
    log.trace("removeWorkout: userId={}, workoutId={}", userId, workoutId);
    long startTime = System.nanoTime();
    
    userRepository.findById(userId)
        .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
    UserSavedWorkout.Id id = new UserSavedWorkout.Id(userId, workoutId);
    if (!savedWorkoutRepository.existsById(id)) {
      log.debug("Workout {} not found in library for user {}", workoutId, userId);
      return false;
    }
    savedWorkoutRepository.deleteById(id);
    
    long duration = System.nanoTime() - startTime;
    log.info("Workout {} removed for user {} (durationMs={})", workoutId, userId, duration / 1_000_000);
    meterRegistry.counter("user.library.remove", "type", "workout").increment();
    meterRegistry.timer("user.library.remove.duration", "type", "workout").record(duration, java.util.concurrent.TimeUnit.NANOSECONDS);
    
    return true;
  }

  @Transactional(readOnly = true)
  public PageResult<SavedWorkout> getSavedWorkouts(UUID userId) {
    return getSavedWorkouts(userId, 0, DEFAULT_PAGE_SIZE, Sort.by(Sort.Order.desc("savedAt")));
  }

  @Transactional(readOnly = true)
  public PageResult<SavedWorkout> getSavedWorkouts(UUID userId, int page, int size, Sort sort) {
    log.trace("getSavedWorkouts: userId={}, page={}, size={}, sort={}", userId, page, size, sort);
    long startTime = System.nanoTime();
    
    Pageable pageable = pageRequest(page, size, sort);
    var pageResult = savedWorkoutRepository.findByUser_Id(userId, pageable);
    var workouts = pageResult.getContent().stream()
      .map(entry -> toSavedWorkout(entry.getWorkout(), entry.getSavedAt(), true))
      .collect(Collectors.toList());
    
    long duration = System.nanoTime() - startTime;
    log.debug("Fetched {} saved workouts for user {} (page={}, size={}, sort={}, totalElements={}, durationMs={})",
        workouts.size(), userId, pageResult.getNumber(), pageResult.getSize(), sort, 
        pageResult.getTotalElements(), duration / 1_000_000);
    meterRegistry.counter("user.library.fetch", "type", "workout").increment();
    meterRegistry.timer("user.library.fetch.duration", "type", "workout").record(duration, java.util.concurrent.TimeUnit.NANOSECONDS);
    
    return new PageResult<>(
        workouts,
        pageResult.getNumber(),
        pageResult.getSize(),
        pageResult.getTotalElements(),
        pageResult.hasNext());
  }

  @Transactional
  public SavedRecipe saveRecipe(UUID userId, UUID recipeId) {
    long startTime = System.nanoTime();
    log.trace("saveRecipe: userId={}, recipeId={}", userId, recipeId);
    
    userRepository.findById(userId)
        .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
    Recipe recipe = recipeRepository.findById(recipeId)
        .orElseThrow(() -> new EntityNotFoundException("Recipe not found: " + recipeId));

    UserSavedRecipe.Id id = new UserSavedRecipe.Id(userId, recipeId);
    log.debug("Attempting to save recipe {} for user {}", recipeId, userId);
    var existing = savedRecipeRepository.findById(id);
    UserSavedRecipe persisted;
    boolean alreadySaved;
    if (existing.isPresent()) {
      persisted = existing.get();
      alreadySaved = true;
      log.debug("Recipe {} already saved for user {} at {}", recipeId, userId, persisted.getSavedAt());
    } else {
      UserSavedRecipe created = new UserSavedRecipe();
      created.setId(id);
      created.setUser(userRepository.getReferenceById(userId));
      created.setRecipe(recipe);
      savedRecipeRepository.save(created);
      persisted = savedRecipeRepository.findById(id)
          .orElseThrow(() -> new IllegalStateException("Saved recipe missing immediately after persist: " + id));
      alreadySaved = false;
    }
    
    long duration = System.nanoTime() - startTime;
    log.info("Recipe {} saved for user {} (alreadySaved={}, durationMs={})", 
        recipeId, userId, alreadySaved, duration / 1_000_000);
    meterRegistry.counter("user.library.save", "type", "recipe", "alreadySaved", Boolean.toString(alreadySaved)).increment();
    meterRegistry.timer("user.library.save.duration", "type", "recipe").record(duration, java.util.concurrent.TimeUnit.NANOSECONDS);
    
    return toSavedRecipe(persisted.getRecipe(), persisted.getSavedAt(), alreadySaved);
  }

  @Transactional
  public boolean removeRecipe(UUID userId, UUID recipeId) {
    log.trace("removeRecipe: userId={}, recipeId={}", userId, recipeId);
    long startTime = System.nanoTime();
    
    userRepository.findById(userId)
        .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
    UserSavedRecipe.Id id = new UserSavedRecipe.Id(userId, recipeId);
    if (!savedRecipeRepository.existsById(id)) {
      log.debug("Recipe {} not found in library for user {}", recipeId, userId);
      return false;
    }
    savedRecipeRepository.deleteById(id);
    
    long duration = System.nanoTime() - startTime;
    log.info("Recipe {} removed for user {} (durationMs={})", recipeId, userId, duration / 1_000_000);
    meterRegistry.counter("user.library.remove", "type", "recipe").increment();
    meterRegistry.timer("user.library.remove.duration", "type", "recipe").record(duration, java.util.concurrent.TimeUnit.NANOSECONDS);
    
    return true;
  }

  @Transactional(readOnly = true)
  public PageResult<SavedRecipe> getSavedRecipes(UUID userId) {
    return getSavedRecipes(userId, 0, DEFAULT_PAGE_SIZE, Sort.by(Sort.Order.desc("savedAt")));
  }

  @Transactional(readOnly = true)
  public PageResult<SavedRecipe> getSavedRecipes(UUID userId, int page, int size, Sort sort) {
    log.trace("getSavedRecipes: userId={}, page={}, size={}, sort={}", userId, page, size, sort);
    long startTime = System.nanoTime();
    
    Pageable pageable = pageRequest(page, size, sort);
    var pageResult = savedRecipeRepository.findByUser_Id(userId, pageable);
    var recipes = pageResult.getContent().stream()
        .map(entry -> toSavedRecipe(entry.getRecipe(), entry.getSavedAt(), true))
        .collect(Collectors.toList());
    
    long duration = System.nanoTime() - startTime;
    log.debug("Fetched {} saved recipes for user {} (page={}, size={}, sort={}, totalElements={}, durationMs={})",
        recipes.size(), userId, pageResult.getNumber(), pageResult.getSize(), sort,
        pageResult.getTotalElements(), duration / 1_000_000);
    meterRegistry.counter("user.library.fetch", "type", "recipe").increment();
    meterRegistry.timer("user.library.fetch.duration", "type", "recipe").record(duration, java.util.concurrent.TimeUnit.NANOSECONDS);
    
    return new PageResult<>(
        recipes,
        pageResult.getNumber(),
        pageResult.getSize(),
        pageResult.getTotalElements(),
        pageResult.hasNext());
  }

  private SavedWorkout toSavedWorkout(ExerciseVideo workout, OffsetDateTime savedAt, boolean alreadySaved) {
    return new SavedWorkout(
        workout.getId(),
        workout.getYoutubeId(),
        workout.getExerciseName(),
        workout.getIsShort() != null && workout.getIsShort() ? 5 : 10,
        "all",
        List.of(),
        buildBodyParts(workout),
        workout.getThumbnailUrl(),
        0L,
        savedAt,
        alreadySaved
    );
  }

  private List<String> buildBodyParts(ExerciseVideo workout) {
    List<String> parts = new java.util.ArrayList<>();
    if (workout.getPrimaryCategory() != null) {
      parts.add(workout.getPrimaryCategory());
    }
    if (workout.getSecondaryCategory() != null) {
      parts.add(workout.getSecondaryCategory());
    }
    return parts.isEmpty() ? List.of() : List.copyOf(parts);
  }

  private Pageable pageRequest(int page, int size, Sort sort) {
    int sanitizedSize = Math.min(size <= 0 ? DEFAULT_PAGE_SIZE : size, MAX_PAGE_SIZE);
    int sanitizedPage = Math.max(page, 0);
    Sort effectiveSort = (sort == null || sort.isUnsorted()) ? Sort.by(Sort.Order.desc("savedAt")) : sort;
    return PageRequest.of(sanitizedPage, sanitizedSize, effectiveSort);
  }

  private SavedRecipe toSavedRecipe(Recipe recipe, OffsetDateTime savedAt, boolean alreadySaved) {
    Integer timeMinutes = recipe.getTimeMinutes();
    return new SavedRecipe(
        recipe.getId(),
        recipe.getTitle(),
        timeMinutes,
        recipe.getDifficulty(),
        recipe.getImageUrl(),
        recipe.getNutritionSummary(),
        savedAt,
        alreadySaved
    );
  }

  public record SavedWorkout(
      UUID id,
      String youtubeId,
      String title,
      Integer durationMinutes,
      String level,
      List<String> equipment,
      List<String> bodyPart,
      String thumbnailUrl,
      Long viewCount,
      java.time.OffsetDateTime savedAt,
      boolean alreadySaved
  ) {}

  public record SavedRecipe(
      UUID id,
      String title,
      Integer timeMinutes,
      String difficulty,
      String imageUrl,
      JsonNode nutritionSummary,
      OffsetDateTime savedAt,
      boolean alreadySaved
  ) {}

  public record PageResult<T>(
      List<T> items,
      int page,
      int size,
      long total,
      boolean hasNext
  ) {}
}
