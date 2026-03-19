package com.fitnessapp.backend.nutrition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.nutrition.controller.MealController;
import com.fitnessapp.backend.nutrition.dto.CreateMealRequest;
import com.fitnessapp.backend.nutrition.entity.MealLog;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository;
import com.fitnessapp.backend.nutrition.service.MealHistoryService;
import com.fitnessapp.backend.nutrition.service.MealInsightsService;
import com.fitnessapp.backend.security.AuthenticatedUser;
import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.user.repository.UserRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

@ExtendWith(MockitoExtension.class)
class MealControllerFlowTest {

  @Mock
  private MealLogRepository mealLogRepository;

  @Mock
  private UserRepository userRepository;

  @Mock
  private UserProfileRepository userProfileRepository;

  @Mock
  private MealHistoryService mealHistoryService;

  @Mock
  private MealInsightsService mealInsightsService;

  private ObjectMapper objectMapper;
  private MealController controller;

  @BeforeEach
  void setUp() {
    objectMapper = new ObjectMapper();
    objectMapper.findAndRegisterModules();
    controller = new MealController(
        mealLogRepository,
        userRepository,
        userProfileRepository,
        objectMapper,
        mealHistoryService,
        mealInsightsService);
  }

  @Test
  void createMealAndTodaySummaryIncludeImage() {
    UUID userId = UUID.randomUUID();
    AuthenticatedUser authUser = new AuthenticatedUser(1L, "test-key", userId);

    CreateMealRequest.FoodItemRequest item = CreateMealRequest.FoodItemRequest.builder()
        .foodKey("grilled_chicken")
        .displayName("Grilled Chicken")
        .grams(150)
        .calories(new BigDecimal("320"))
        .protein(new BigDecimal("45"))
        .fat(new BigDecimal("8"))
        .carbs(new BigDecimal("5"))
        .build();

    CreateMealRequest request = CreateMealRequest.builder()
        .mealType("lunch")
        .items(List.of(item))
        .note("Post workout meal")
        .imageUrl("https://bucket.s3.us-east-1.amazonaws.com/meals/test.jpg")
        .build();

    User user = User.builder()
        .id(userId)
        .email("test@example.com")
        .timeBucket(0)
        .level("1")
        .build();

    when(userRepository.findById(userId)).thenReturn(Optional.of(user));

    MealLog savedMeal = MealLog.builder()
        .id(10L)
        .userId(userId)
        .mealType("lunch")
        .foodItems("[]")
        .imageUrl(request.getImageUrl())
        .notes(request.getNote())
        .totalCalories(320)
        .totalProtein(new BigDecimal("45"))
        .totalCarbs(new BigDecimal("5"))
        .totalFat(new BigDecimal("8"))
        .consumedAt(OffsetDateTime.now())
        .build();

    when(mealLogRepository.save(any(MealLog.class))).thenReturn(savedMeal);

    ResponseEntity<MealController.MealResponse> created = controller.createMeal(request, authUser);
    assertThat(created.getBody()).isNotNull();
    assertThat(created.getBody().getImageUrl())
        .isEqualTo("https://bucket.s3.us-east-1.amazonaws.com/meals/test.jpg");

    UserProfile profile = UserProfile.builder()
        .userId(userId)
        .user(user)
        .dailyCalorieTarget(2000)
        .dailyProteinTarget(150)
        .dailyCarbsTarget(200)
        .dailyFatTarget(70)
        .build();

    when(userProfileRepository.findByUserId(any(UUID.class))).thenReturn(Optional.of(profile));
    when(mealLogRepository.findByUserIdAndConsumedAtBetweenOrderByConsumedAtDesc(
        any(UUID.class),
        any(OffsetDateTime.class),
        any(OffsetDateTime.class)
    )).thenReturn(List.of(savedMeal));

    ResponseEntity<MealController.TodaySummaryResponse> summary =
        controller.getTodaySummary(authUser, "UTC");

    assertThat(summary.getBody()).isNotNull();
    assertThat(summary.getBody().getMeals()).hasSize(1);
    assertThat(summary.getBody().getMeals().get(0).getImageUrl())
        .isEqualTo("https://bucket.s3.us-east-1.amazonaws.com/meals/test.jpg");
  }
}
