package com.fitnessapp.backend.recipe;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.recipe.entity.Recipe;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.workout.entity.WorkoutSession;
import com.fitnessapp.backend.openai.ChatCompletionClient;
import com.fitnessapp.backend.recipe.service.SmartRecipeService.MealPlanResponse;
import com.fitnessapp.backend.recipe.service.SmartRecipeService.NutritionTarget;
import com.fitnessapp.backend.recipe.repository.RecipeRepository;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.workout.repository.WorkoutSessionRepository;
import com.fitnessapp.backend.recipe.service.SmartRecipeService;
import com.fitnessapp.backend.service.quota.QuotaService;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class SmartRecipeServiceTest {

  @Mock
  private UserProfileRepository userProfileRepository;

  @Mock
  private WorkoutSessionRepository workoutSessionRepository;

  @Mock
  private RecipeRepository recipeRepository;

  @Mock
  private MealPlanHistoryService mealPlanHistoryService;

  @Mock
  private ChatCompletionClient chatCompletionClient;

  @Mock
  private StringRedisTemplate redisTemplate;

  @Mock
  private ValueOperations<String, String> valueOperations;

  @Mock
  private QuotaService quotaService;

  private ObjectMapper objectMapper;

  private SmartRecipeService smartRecipeService;

  @BeforeEach
  void setUp() {
    objectMapper = new ObjectMapper();
    when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    lenient().doNothing().when(valueOperations).set(anyString(), anyString(), any(Duration.class));
    smartRecipeService = new SmartRecipeService(userProfileRepository, workoutSessionRepository,
        recipeRepository, mealPlanHistoryService, Optional.of(chatCompletionClient), objectMapper, redisTemplate, quotaService);
    ReflectionTestUtils.setField(smartRecipeService, "mealPlanModel", "gpt-4o");
    ReflectionTestUtils.setField(smartRecipeService, "cacheTtlHours", 24L);
    lenient().when(mealPlanHistoryService.latestPlan(any())).thenReturn(Optional.empty());
    lenient().when(mealPlanHistoryService.storePlan(any(), any(), anyString(), anyString())).thenReturn(null);
  }

  @Test
  void returnsCachedMealPlanWhenAvailable() throws Exception {
    UUID userId = UUID.randomUUID();
    MealPlanResponse cached = new MealPlanResponse(new NutritionTarget(2200, 160, 240, 70), List.of());
    when(valueOperations.get("meal-plan:" + userId)).thenReturn(objectMapper.writeValueAsString(cached));

    MealPlanResponse response = smartRecipeService.generateMealPlan(userId);

    assertThat(response).isNotNull();
    assertThat(response.target().calories()).isEqualTo(2200);
    verify(userProfileRepository, times(0)).findByUserId(userId);
    verify(mealPlanHistoryService, times(0)).storePlan(any(), any(), anyString(), anyString());
  }

  @Test
  void generatesMealPlanFromOpenAi() throws Exception {
    UUID userId = UUID.randomUUID();
    when(valueOperations.get("meal-plan:" + userId)).thenReturn(null);

    UserProfile profile = new UserProfile();
    profile.setHeightCm(180);
    profile.setWeightKg(78.0);
    profile.setDailyCalorieTarget(2500);
    profile.setAllergens(Set.of());
    when(userProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

    WorkoutSession session = new WorkoutSession();
    session.setDurationSeconds(1800);
    session.setExerciseType("squat");
    when(workoutSessionRepository.findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(eq(userId), any(), any()))
        .thenReturn(List.of(session));

    String completion = "{" +
        "\"days\":[{" +
        "\"dayNumber\":1,\"meals\":[{" +
        "\"type\":\"breakfast\",\"recipeName\":\"燕麦蛋白碗\",\"calories\":450,\"protein\":30,\"carbs\":55,\"fat\":12},{" +
        "\"type\":\"lunch\",\"recipeName\":\"鸡胸肉沙拉\",\"calories\":520,\"protein\":45,\"carbs\":40,\"fat\":18},{" +
        "\"type\":\"dinner\",\"recipeName\":\"牛排配蔬菜\",\"calories\":600,\"protein\":48,\"carbs\":35,\"fat\":20},{" +
        "\"type\":\"snack\",\"recipeName\":\"希腊酸奶\",\"calories\":200,\"protein\":18,\"carbs\":15,\"fat\":5}]}]}";

    when(chatCompletionClient.complete(anyString(), any(), anyInt(), anyDouble())).thenReturn(completion);

    Recipe recipe = Recipe.builder().id(UUID.randomUUID()).title("示例").difficulty("easy").build();
    when(recipeRepository.findFirstByTitleIgnoreCase(anyString())).thenReturn(Optional.of(recipe));

    MealPlanResponse response = smartRecipeService.generateMealPlan(userId);

    assertThat(response.days()).hasSize(1);
    assertThat(response.days().get(0).meals()).hasSize(4);
    verify(valueOperations).set(eq("meal-plan:" + userId), anyString(), any(Duration.class));
    verify(mealPlanHistoryService).storePlan(eq(userId), any(MealPlanResponse.class), anyString(), anyString());
  }

  @Test
  void fallsBackWhenOpenAiFails() {
    UUID userId = UUID.randomUUID();
    when(valueOperations.get("meal-plan:" + userId)).thenReturn(null);

    UserProfile profile = new UserProfile();
    profile.setDailyCalorieTarget(2200);
    profile.setAllergens(Set.of());
    when(userProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
    when(workoutSessionRepository.findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(eq(userId), any(), any()))
        .thenReturn(List.of());
    when(chatCompletionClient.complete(anyString(), any(), anyInt(), anyDouble()))
        .thenThrow(new RuntimeException("OpenAI error"));

    Recipe recipe = Recipe.builder().id(UUID.randomUUID()).title("Fallback Meal").difficulty("easy").build();
    when(recipeRepository.findTop12ByOrderByCreatedAtDesc()).thenReturn(List.of(recipe));

    MealPlanResponse response = smartRecipeService.generateMealPlan(userId);

    assertThat(response.days()).hasSize(7);
    assertThat(response.days().get(0).meals()).hasSize(4);
    verify(recipeRepository).findTop12ByOrderByCreatedAtDesc();
    verify(mealPlanHistoryService).storePlan(eq(userId), any(MealPlanResponse.class), anyString(), anyString());
  }
}
