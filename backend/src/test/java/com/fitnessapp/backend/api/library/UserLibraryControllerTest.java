package com.fitnessapp.backend.api.library;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.security.AuthenticatedUser;
import com.fitnessapp.backend.security.CurrentUser;
import com.fitnessapp.backend.workout.controller.UserLibraryController;
import com.fitnessapp.backend.workout.service.UserLibraryService;
import com.fitnessapp.backend.workout.service.UserLibraryService.PageResult;
import com.fitnessapp.backend.workout.service.UserLibraryService.SavedRecipe;
import com.fitnessapp.backend.workout.service.UserLibraryService.SavedWorkout;
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
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class UserLibraryControllerTest {

  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @Mock
  private UserLibraryService libraryService;

  @Mock
  private CurrentUser currentUser;

  @BeforeEach
  void setUp() {
    objectMapper = new ObjectMapper();
    objectMapper.findAndRegisterModules();
    UserLibraryController controller = new UserLibraryController(libraryService, currentUser);
    mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
  }

  @Test
  void saveWorkoutUsesAuthenticatedUserWhenMissingInPayload() throws Exception {
    UUID userId = UUID.randomUUID();
    UUID workoutId = UUID.randomUUID();
    when(currentUser.get()).thenReturn(Optional.of(new AuthenticatedUser(1L, "Key", userId)));

    var request = new UserLibraryController.SaveWorkoutRequest(workoutId, null);

    SavedWorkout savedWorkout = new SavedWorkout(
        workoutId,
        "yt123",
        "Morning Flow",
        25,
        "BEGINNER",
        List.of("yoga mat"),
        List.of("core"),
        "https://thumb",
        500L,
        OffsetDateTime.now(),
        false);
    when(libraryService.saveWorkout(userId, workoutId)).thenReturn(savedWorkout);

    mockMvc.perform(post("/api/v1/workouts/save")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.youtubeId").value("yt123"));

    verify(libraryService).saveWorkout(userId, workoutId);
  }

  @Test
  void saveRecipeRejectsWhenUserMismatch() throws Exception {
    UUID authenticatedId = UUID.randomUUID();
    UUID requestUserId = UUID.randomUUID();
    UUID recipeId = UUID.randomUUID();
    when(currentUser.get()).thenReturn(Optional.of(new AuthenticatedUser(1L, "Key", authenticatedId)));

    var request = new UserLibraryController.SaveRecipeRequest(recipeId, requestUserId);

    mockMvc.perform(post("/api/v1/recipes/save")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isForbidden());
  }

  @Test
  void returnsSavedRecipes() throws Exception {
    UUID userId = UUID.randomUUID();
    when(currentUser.get()).thenReturn(Optional.of(new AuthenticatedUser(2L, "Key", userId)));

    SavedRecipe recipe = new SavedRecipe(
        UUID.randomUUID(),
        "Protein Bowl",
        20,
        "EASY",
        "https://example.com/image.jpg",
        null,
        OffsetDateTime.now(),
        true);
    when(libraryService.getSavedRecipes(eq(userId), eq(0), eq(20), any(Sort.class)))
        .thenReturn(new PageResult<>(List.of(recipe), 0, 20, 1, false));

    mockMvc.perform(get("/api/v1/recipes/saved"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].title").value("Protein Bowl"));

    ArgumentCaptor<Sort> sortCaptor = ArgumentCaptor.forClass(Sort.class);
    verify(libraryService).getSavedRecipes(eq(userId), eq(0), eq(20), sortCaptor.capture());
    Sort.Order order = sortCaptor.getValue().getOrderFor("savedAt");
    assertThat(order).isNotNull();
    assertThat(order.getDirection()).isEqualTo(Sort.Direction.DESC);
  }

  @Test
  void returnsSavedWorkoutsForExplicitUser() throws Exception {
    UUID userId = UUID.randomUUID();
    when(currentUser.get()).thenReturn(Optional.of(new AuthenticatedUser(1L, "Key", userId)));

    SavedWorkout workout = new SavedWorkout(
        UUID.randomUUID(),
        "abc123",
        "HIIT Blast",
        30,
        "INTERMEDIATE",
        List.of("dumbbells"),
        List.of("shoulders"),
        "https://example.com/thumb.jpg",
        10000L,
        OffsetDateTime.now(),
        true);
    when(libraryService.getSavedWorkouts(eq(userId), eq(0), eq(20), any(Sort.class)))
        .thenReturn(new PageResult<>(List.of(workout), 0, 20, 1, false));

    mockMvc.perform(get("/api/v1/workouts/saved").param("userId", userId.toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items[0].youtubeId").value("abc123"));

    ArgumentCaptor<Sort> workoutSortCaptor = ArgumentCaptor.forClass(Sort.class);
    verify(libraryService).getSavedWorkouts(eq(userId), eq(0), eq(20), workoutSortCaptor.capture());
    Sort.Order workoutOrder = workoutSortCaptor.getValue().getOrderFor("savedAt");
    assertThat(workoutOrder).isNotNull();
    assertThat(workoutOrder.getDirection()).isEqualTo(Sort.Direction.DESC);
  }

  @Test
  void respectsPaginationParameters() throws Exception {
    UUID userId = UUID.randomUUID();
    when(currentUser.get()).thenReturn(Optional.of(new AuthenticatedUser(5L, "Key", userId)));
    when(libraryService.getSavedWorkouts(eq(userId), eq(2), eq(5), any(Sort.class)))
        .thenReturn(new PageResult<>(List.of(), 2, 5, 0, false));

    mockMvc.perform(get("/api/v1/workouts/saved")
            .param("page", "2")
            .param("size", "5"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.items").isArray());

    verify(libraryService).getSavedWorkouts(eq(userId), eq(2), eq(5), any(Sort.class));
  }

  @Test
  void supportsDurationSortForWorkouts() throws Exception {
    UUID userId = UUID.randomUUID();
    when(currentUser.get()).thenReturn(Optional.of(new AuthenticatedUser(9L, "Key", userId)));
    when(libraryService.getSavedWorkouts(eq(userId), eq(0), eq(20), any(Sort.class)))
        .thenReturn(new PageResult<>(List.of(), 0, 20, 0, false));

    mockMvc.perform(get("/api/v1/workouts/saved")
            .param("sort", "duration,asc"))
        .andExpect(status().isOk());

    ArgumentCaptor<Sort> sortCaptor = ArgumentCaptor.forClass(Sort.class);
    verify(libraryService).getSavedWorkouts(eq(userId), eq(0), eq(20), sortCaptor.capture());
    Sort captured = sortCaptor.getValue();
    Sort.Order primary = captured.getOrderFor("workout.durationMinutes");
    assertThat(primary).isNotNull();
    assertThat(primary.getDirection()).isEqualTo(Sort.Direction.ASC);
    Sort.Order secondary = captured.getOrderFor("savedAt");
    assertThat(secondary).isNotNull();
  }

  @Test
  void supportsPrepTimeSortForRecipes() throws Exception {
    UUID userId = UUID.randomUUID();
    when(currentUser.get()).thenReturn(Optional.of(new AuthenticatedUser(11L, "Key", userId)));
    when(libraryService.getSavedRecipes(eq(userId), eq(0), eq(20), any(Sort.class)))
        .thenReturn(new PageResult<>(List.of(), 0, 20, 0, false));

    mockMvc.perform(get("/api/v1/recipes/saved")
            .param("sort", "time,asc"))
        .andExpect(status().isOk());

    ArgumentCaptor<Sort> sortCaptor = ArgumentCaptor.forClass(Sort.class);
    verify(libraryService).getSavedRecipes(eq(userId), eq(0), eq(20), sortCaptor.capture());
    Sort captured = sortCaptor.getValue();
    Sort.Order primary = captured.getOrderFor("recipe.timeMinutes");
    assertThat(primary).isNotNull();
    assertThat(primary.getDirection()).isEqualTo(Sort.Direction.ASC);
    Sort.Order secondary = captured.getOrderFor("savedAt");
    assertThat(secondary).isNotNull();
  }

  @Test
  void removesSavedWorkout() throws Exception {
    UUID userId = UUID.randomUUID();
    UUID workoutId = UUID.randomUUID();
    when(currentUser.get()).thenReturn(Optional.of(new AuthenticatedUser(3L, "Key", userId)));
    when(libraryService.removeWorkout(userId, workoutId)).thenReturn(true);

    mockMvc.perform(delete("/api/v1/workouts/saved/" + workoutId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.success").value(true));

    verify(libraryService).removeWorkout(userId, workoutId);
  }

  @Test
  void removesSavedRecipe() throws Exception {
    UUID userId = UUID.randomUUID();
    UUID recipeId = UUID.randomUUID();
    when(currentUser.get()).thenReturn(Optional.of(new AuthenticatedUser(4L, "Key", userId)));
    when(libraryService.removeRecipe(userId, recipeId)).thenReturn(true);

    mockMvc.perform(delete("/api/v1/recipes/saved/" + recipeId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.success").value(true));

    verify(libraryService).removeRecipe(userId, recipeId);
  }
}
