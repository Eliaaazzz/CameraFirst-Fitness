package com.fitnessapp.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fitnessapp.backend.recipe.entity.Recipe;
import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.recipe.entity.UserSavedRecipe;
import com.fitnessapp.backend.workout.entity.UserSavedWorkout;
import com.fitnessapp.backend.workout.entity.WorkoutVideo;
import com.fitnessapp.backend.recipe.repository.RecipeRepository;
import com.fitnessapp.backend.user.repository.UserRepository;
import com.fitnessapp.backend.recipe.repository.UserSavedRecipeRepository;
import com.fitnessapp.backend.workout.repository.UserSavedWorkoutRepository;
import com.fitnessapp.backend.workout.repository.WorkoutVideoRepository;
import com.fitnessapp.backend.workout.service.UserLibraryService;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

@ExtendWith(MockitoExtension.class)
class UserLibraryServiceTest {

  @Mock private UserRepository userRepository;
  @Mock private WorkoutVideoRepository workoutVideoRepository;
  @Mock private RecipeRepository recipeRepository;
  @Mock private UserSavedWorkoutRepository savedWorkoutRepository;
  @Mock private UserSavedRecipeRepository savedRecipeRepository;

  private UserLibraryService service;

  @BeforeEach
  void setUp() {
    service = new UserLibraryService(
        userRepository,
        workoutVideoRepository,
        recipeRepository,
        savedWorkoutRepository,
        savedRecipeRepository,
        new SimpleMeterRegistry());
  }

  @Test
  void saveWorkoutReturnsPersistedTimestampForNewEntry() {
    UUID userId = UUID.randomUUID();
    UUID workoutId = UUID.randomUUID();

    User user = new User();
    user.setId(userId);
    WorkoutVideo workout = new WorkoutVideo();
    workout.setId(workoutId);
    workout.setTitle("Strength Flow");
    workout.setDurationMinutes(20);
    workout.setLevel("beginner");

    when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    when(workoutVideoRepository.findById(workoutId)).thenReturn(Optional.of(workout));

    UserSavedWorkout.Id key = new UserSavedWorkout.Id(userId, workoutId);
    UserSavedWorkout persisted = new UserSavedWorkout();
    persisted.setId(key);
    persisted.setUser(user);
    persisted.setWorkout(workout);
    OffsetDateTime savedAt = OffsetDateTime.now();
    persisted.setSavedAt(savedAt);

    when(savedWorkoutRepository.findById(key))
        .thenReturn(Optional.empty())
        .thenReturn(Optional.of(persisted));
    when(savedWorkoutRepository.save(any(UserSavedWorkout.class))).thenAnswer(invocation -> invocation.getArgument(0));

    var result = service.saveWorkout(userId, workoutId);

    assertThat(result.savedAt()).isEqualTo(savedAt);
    assertThat(result.alreadySaved()).isFalse();
    verify(savedWorkoutRepository).save(any(UserSavedWorkout.class));
    verify(savedWorkoutRepository, times(2)).findById(key);
  }

  @Test
  void saveWorkoutShortCircuitsWhenAlreadySaved() {
    UUID userId = UUID.randomUUID();
    UUID workoutId = UUID.randomUUID();

    User user = new User();
    user.setId(userId);
    WorkoutVideo workout = new WorkoutVideo();
    workout.setId(workoutId);

    UserSavedWorkout.Id key = new UserSavedWorkout.Id(userId, workoutId);
    UserSavedWorkout existing = new UserSavedWorkout();
    existing.setId(key);
    existing.setUser(user);
    existing.setWorkout(workout);
    existing.setSavedAt(OffsetDateTime.now().minusDays(1));

    when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    when(workoutVideoRepository.findById(workoutId)).thenReturn(Optional.of(workout));
    when(savedWorkoutRepository.findById(key)).thenReturn(Optional.of(existing));

    var result = service.saveWorkout(userId, workoutId);

    assertThat(result.alreadySaved()).isTrue();
    assertThat(result.savedAt()).isEqualTo(existing.getSavedAt());
    verify(savedWorkoutRepository, never()).save(any());
  }

  @Test
  void getSavedWorkoutsRespectsPagingAndSort() {
    UUID userId = UUID.randomUUID();
    WorkoutVideo workout = new WorkoutVideo();
    workout.setId(UUID.randomUUID());
    workout.setTitle("Mobility");
    workout.setLevel("beginner");
    workout.setDurationMinutes(15);
    UserSavedWorkout entity = new UserSavedWorkout();
    entity.setId(new UserSavedWorkout.Id(userId, workout.getId()));
    entity.setWorkout(workout);
    entity.setSavedAt(OffsetDateTime.now());

    when(savedWorkoutRepository.findByUser_Id(eq(userId), any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of(entity), PageRequest.of(0, 5, Sort.by(Sort.Direction.ASC, "savedAt")), 1));

    var result = service.getSavedWorkouts(userId, 0, 5, Sort.by(Sort.Direction.ASC, "savedAt"));

    assertThat(result.items()).hasSize(1);
    assertThat(result.total()).isEqualTo(1);
    assertThat(result.hasNext()).isFalse();

    ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
    verify(savedWorkoutRepository).findByUser_Id(eq(userId), pageableCaptor.capture());
    Sort.Order order = pageableCaptor.getValue().getSort().getOrderFor("savedAt");
    assertThat(order).isNotNull();
    assertThat(order.getDirection()).isEqualTo(Sort.Direction.ASC);
  }

  @Test
  void saveRecipeReturnsAlreadySavedFlag() {
    UUID userId = UUID.randomUUID();
    UUID recipeId = UUID.randomUUID();
    User user = new User();
    user.setId(userId);
    Recipe recipe = new Recipe();
    recipe.setId(recipeId);
    recipe.setTitle("Protein Bowl");

    UserSavedRecipe.Id key = new UserSavedRecipe.Id(userId, recipeId);
    UserSavedRecipe existing = new UserSavedRecipe();
    existing.setId(key);
    existing.setUser(user);
    existing.setRecipe(recipe);
    existing.setSavedAt(OffsetDateTime.now());

    when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    when(recipeRepository.findById(recipeId)).thenReturn(Optional.of(recipe));
    when(savedRecipeRepository.findById(key)).thenReturn(Optional.of(existing));

    var result = service.saveRecipe(userId, recipeId);

    assertThat(result.alreadySaved()).isTrue();
    assertThat(result.savedAt()).isEqualTo(existing.getSavedAt());
    verify(savedRecipeRepository, never()).save(any());
  }

  @Test
  void getSavedRecipesReturnsPagedResult() {
    UUID userId = UUID.randomUUID();
    Recipe recipe = new Recipe();
    recipe.setId(UUID.randomUUID());
    recipe.setTitle("Smoothie");
    recipe.setTimeMinutes(10);
    recipe.setDifficulty("easy");

    UserSavedRecipe entity = new UserSavedRecipe();
    entity.setId(new UserSavedRecipe.Id(userId, recipe.getId()));
    entity.setRecipe(recipe);
    entity.setSavedAt(OffsetDateTime.now());

    when(savedRecipeRepository.findByUser_Id(eq(userId), any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of(entity), PageRequest.of(1, 10, Sort.by(Sort.Direction.DESC, "savedAt")), 12));

    var result = service.getSavedRecipes(userId, 1, 10, Sort.by(Sort.Direction.DESC, "savedAt"));

    assertThat(result.items()).hasSize(1);
    assertThat(result.page()).isEqualTo(1);
    assertThat(result.total()).isEqualTo(11);
    assertThat(result.hasNext()).isFalse();
  }

  @Test
  void removeWorkoutReturnsTrueWhenDeleted() {
    UUID userId = UUID.randomUUID();
    UUID workoutId = UUID.randomUUID();
    User user = new User();
    user.setId(userId);

    when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    UserSavedWorkout.Id key = new UserSavedWorkout.Id(userId, workoutId);
    when(savedWorkoutRepository.existsById(key)).thenReturn(true);

    boolean result = service.removeWorkout(userId, workoutId);

    assertThat(result).isTrue();
    verify(savedWorkoutRepository).deleteById(key);
  }

  @Test
  void removeWorkoutReturnsFalseWhenNotFound() {
    UUID userId = UUID.randomUUID();
    UUID workoutId = UUID.randomUUID();
    User user = new User();
    user.setId(userId);

    when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    UserSavedWorkout.Id key = new UserSavedWorkout.Id(userId, workoutId);
    when(savedWorkoutRepository.existsById(key)).thenReturn(false);

    boolean result = service.removeWorkout(userId, workoutId);

    assertThat(result).isFalse();
    verify(savedWorkoutRepository, never()).deleteById(any());
  }

  @Test
  void removeRecipeReturnsTrueWhenDeleted() {
    UUID userId = UUID.randomUUID();
    UUID recipeId = UUID.randomUUID();
    User user = new User();
    user.setId(userId);

    when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    UserSavedRecipe.Id key = new UserSavedRecipe.Id(userId, recipeId);
    when(savedRecipeRepository.existsById(key)).thenReturn(true);

    boolean result = service.removeRecipe(userId, recipeId);

    assertThat(result).isTrue();
    verify(savedRecipeRepository).deleteById(key);
  }

  @Test
  void removeRecipeReturnsFalseWhenNotFound() {
    UUID userId = UUID.randomUUID();
    UUID recipeId = UUID.randomUUID();
    User user = new User();
    user.setId(userId);

    when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    UserSavedRecipe.Id key = new UserSavedRecipe.Id(userId, recipeId);
    when(savedRecipeRepository.existsById(key)).thenReturn(false);

    boolean result = service.removeRecipe(userId, recipeId);

    assertThat(result).isFalse();
    verify(savedRecipeRepository, never()).deleteById(any());
  }

  @Test
  void getSavedWorkoutsDefaultsTwentyItemsAndDescendingSavedAt() {
    UUID userId = UUID.randomUUID();
    when(savedWorkoutRepository.findByUser_Id(eq(userId), any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of()));

    service.getSavedWorkouts(userId);

    ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
    verify(savedWorkoutRepository).findByUser_Id(eq(userId), pageableCaptor.capture());
    Pageable pageable = pageableCaptor.getValue();

    assertThat(pageable.getPageSize()).isEqualTo(20);
    Sort.Order order = pageable.getSort().getOrderFor("savedAt");
    assertThat(order).isNotNull();
    assertThat(order.getDirection()).isEqualTo(Sort.Direction.DESC);
  }

  @Test
  void getSavedWorkoutsCapsSizeAtOneHundred() {
    UUID userId = UUID.randomUUID();
    when(savedWorkoutRepository.findByUser_Id(eq(userId), any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of()));

    service.getSavedWorkouts(userId, 0, 200, Sort.unsorted());

    ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
    verify(savedWorkoutRepository).findByUser_Id(eq(userId), pageableCaptor.capture());
    assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(100);
  }

  @Test
  void getSavedRecipesDefaultsTwentyItemsAndDescendingSavedAt() {
    UUID userId = UUID.randomUUID();
    when(savedRecipeRepository.findByUser_Id(eq(userId), any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of()));

    service.getSavedRecipes(userId);

    ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
    verify(savedRecipeRepository).findByUser_Id(eq(userId), pageableCaptor.capture());
    Pageable pageable = pageableCaptor.getValue();

    assertThat(pageable.getPageSize()).isEqualTo(20);
    Sort.Order order = pageable.getSort().getOrderFor("savedAt");
    assertThat(order).isNotNull();
    assertThat(order.getDirection()).isEqualTo(Sort.Direction.DESC);
  }
}
