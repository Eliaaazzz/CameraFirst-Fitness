package com.fitnessapp.backend.nutrition;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.config.TestSecurityConfig;
import com.fitnessapp.backend.nutrition.entity.MealLog;
import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.nutrition.dto.CreateMealRequest;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for MealController
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser
@Transactional
@DisplayName("MealController Integration Tests")
@org.springframework.context.annotation.Import(TestSecurityConfig.class)
class MealControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MealLogRepository mealLogRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserProfileRepository userProfileRepository;

    private User testUser;
    private UserProfile testProfile;

    @BeforeEach
    void setUp() {
        // Clean up
        mealLogRepository.deleteAll();
        userProfileRepository.deleteAll();
        userRepository.deleteAll();

        // Create test user
        testUser = User.builder()
            .id(UUID.randomUUID())
            .email("test@example.com")
            .timeBucket(30)
            .level("intermediate")
            .build();
        testUser = userRepository.save(testUser);

        // Create user profile (do not set userId when using @MapsId - only set user relationship)
        testProfile = UserProfile.builder()
            .user(testUser)
            .dailyCalorieTarget(2000)
            .dailyProteinTarget(130)
            .dailyCarbsTarget(220)
            .dailyFatTarget(70)
            .build();
        testProfile = userProfileRepository.save(testProfile);
    }

    @Test
    @DisplayName("POST /api/v1/meals - Should create meal log successfully")
    void testCreateMeal_Success() throws Exception {
        // Given
        CreateMealRequest request = CreateMealRequest.builder()
            .userId(testUser.getId())
            .mealType("lunch")
            .items(Arrays.asList(
                CreateMealRequest.FoodItemRequest.builder()
                    .foodKey("steamed_rice")
                    .displayName("白米饭")
                    .grams(200)
                    .calories(new BigDecimal("232.0"))
                    .protein(new BigDecimal("5.2"))
                    .fat(new BigDecimal("0.6"))
                    .carbs(new BigDecimal("51.2"))
                    .confidence(new BigDecimal("0.95"))
                    .build(),
                CreateMealRequest.FoodItemRequest.builder()
                    .foodKey("chicken_breast")
                    .displayName("鸡胸肉")
                    .grams(150)
                    .calories(new BigDecimal("199.5"))
                    .protein(new BigDecimal("42.0"))
                    .fat(new BigDecimal("3.0"))
                    .carbs(new BigDecimal("0.0"))
                    .confidence(new BigDecimal("0.90"))
                    .build()
            ))
            .note("Healthy lunch")
            .imageUrl("https://example.com/meal.jpg")
            .build();

        // When/Then
        mockMvc.perform(post("/api/v1/meals")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").exists())
            .andExpect(jsonPath("$.userId").value(testUser.getId().toString()))
            .andExpect(jsonPath("$.mealType").value("lunch"))
            .andExpect(jsonPath("$.totalCalories").value(431)) // 232 + 199.5 rounded
            .andExpect(jsonPath("$.totalProtein").value(47.2))
            .andExpect(jsonPath("$.totalFat").value(3.6))
            .andExpect(jsonPath("$.totalCarbs").value(51.2))
            .andExpect(jsonPath("$.notes").value("Healthy lunch"))
            .andExpect(jsonPath("$.imageUrl").value("https://example.com/meal.jpg"))
            .andExpect(jsonPath("$.foodItems").isArray())
            .andExpect(jsonPath("$.foodItems", hasSize(2)));

        // Verify database
        assertThat(mealLogRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("POST /api/v1/meals - Should fail with non-existent user")
    void testCreateMeal_UserNotFound() throws Exception {
        // Given
        UUID nonExistentUserId = UUID.randomUUID();
        CreateMealRequest request = CreateMealRequest.builder()
            .userId(nonExistentUserId)
            .mealType("lunch")
            .items(Arrays.asList(
                CreateMealRequest.FoodItemRequest.builder()
                    .foodKey("steamed_rice")
                    .displayName("米饭")
                    .grams(200)
                    .calories(new BigDecimal("232.0"))
                    .protein(new BigDecimal("5.2"))
                    .fat(new BigDecimal("0.6"))
                    .carbs(new BigDecimal("51.2"))
                    .build()
            ))
            .build();

        // When/Then
        mockMvc.perform(post("/api/v1/meals")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /api/v1/meals - Should get meals by user and date")
    void testGetMeals_Success() throws Exception {
        // Given: Create some test meals
        OffsetDateTime today = LocalDate.now().atStartOfDay().atOffset(java.time.ZoneOffset.UTC);

        MealLog breakfast = MealLog.builder()
            .userId(testUser.getId())
            .mealType("breakfast")
            .foodItems("[{\"foodKey\":\"fried_egg\",\"displayName\":\"煎蛋\",\"grams\":50}]")
            .totalCalories(98)
            .consumedAt(today.plusHours(8))
            .build();
        mealLogRepository.save(breakfast);

        MealLog lunch = MealLog.builder()
            .userId(testUser.getId())
            .mealType("lunch")
            .foodItems("[{\"foodKey\":\"steamed_rice\",\"displayName\":\"米饭\",\"grams\":200}]")
            .totalCalories(232)
            .consumedAt(today.plusHours(12))
            .build();
        mealLogRepository.save(lunch);

        // When/Then
        mockMvc.perform(get("/api/v1/meals")
                .param("userId", testUser.getId().toString())
                .param("date", LocalDate.now().toString()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(2)))
            .andExpect(jsonPath("$[0].mealType").value("breakfast"))
            .andExpect(jsonPath("$[1].mealType").value("lunch"));
    }

    @Test
    @DisplayName("GET /api/v1/meals - Should return empty list for date with no meals")
    void testGetMeals_NoMeals() throws Exception {
        // When/Then
        mockMvc.perform(get("/api/v1/meals")
                .param("userId", testUser.getId().toString())
                .param("date", "2020-01-01"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("GET /api/v1/meals/today/{userId} - Should get daily summary")
    void testGetTodaySummary_Success() throws Exception {
        // Given: Create today's meals
        OffsetDateTime today = LocalDate.now().atStartOfDay().atOffset(java.time.ZoneOffset.UTC);

        MealLog meal = MealLog.builder()
            .userId(testUser.getId())
            .mealType("lunch")
            .foodItems("[{\"foodKey\":\"steamed_rice\",\"displayName\":\"米饭\",\"grams\":200}]")
            .totalCalories(500)
            .totalProtein(new BigDecimal("30.0"))
            .totalCarbs(new BigDecimal("60.0"))
            .totalFat(new BigDecimal("10.0"))
            .consumedAt(today.plusHours(12))
            .build();
        mealLogRepository.save(meal);

        // When/Then
        mockMvc.perform(get("/api/v1/meals/today/" + testUser.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.date").value(LocalDate.now().toString()))
            .andExpect(jsonPath("$.current.calories").value(500.0))
            .andExpect(jsonPath("$.current.protein").value(30.0))
            .andExpect(jsonPath("$.target.calories").value(2000.0))
            .andExpect(jsonPath("$.target.protein").value(130.0))
            .andExpect(jsonPath("$.meals", hasSize(1)))
            .andExpect(jsonPath("$.healthScore").exists());
    }

    @Test
    @DisplayName("GET /api/v1/meals/today/{userId} - Should fail for non-existent user")
    void testGetTodaySummary_UserNotFound() throws Exception {
        // When/Then
        mockMvc.perform(get("/api/v1/meals/today/" + UUID.randomUUID()))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("DELETE /api/v1/meals/{id} - Should delete meal successfully")
    void testDeleteMeal_Success() throws Exception {
        // Given
        MealLog meal = MealLog.builder()
            .userId(testUser.getId())
            .mealType("lunch")
            .totalCalories(500)
            .consumedAt(OffsetDateTime.now())
            .build();
        meal = mealLogRepository.save(meal);

        assertThat(mealLogRepository.count()).isEqualTo(1);

        // When/Then
        mockMvc.perform(delete("/api/v1/meals/" + meal.getId()))
            .andExpect(status().isNoContent());

        // Verify deletion
        assertThat(mealLogRepository.count()).isEqualTo(0);
    }

    @Test
    @DisplayName("DELETE /api/v1/meals/{id} - Should fail for non-existent meal")
    void testDeleteMeal_NotFound() throws Exception {
        // When/Then
        mockMvc.perform(delete("/api/v1/meals/99999"))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /api/v1/meals - Should validate required fields")
    void testCreateMeal_ValidationError() throws Exception {
        // Given: Invalid request (missing userId)
        String invalidRequest = """
            {
              "mealType": "lunch",
              "items": []
            }
            """;

        // When/Then
        mockMvc.perform(post("/api/v1/meals")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequest))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should handle JSONB serialization correctly")
    void testCreateMeal_JsonbSerialization() throws Exception {
        // Given
        CreateMealRequest request = CreateMealRequest.builder()
            .userId(testUser.getId())
            .mealType("dinner")
            .items(Arrays.asList(
                CreateMealRequest.FoodItemRequest.builder()
                    .foodKey("beef")
                    .displayName("牛肉")
                    .grams(100)
                    .calories(new BigDecimal("125.0"))
                    .protein(new BigDecimal("20.0"))
                    .fat(new BigDecimal("4.5"))
                    .carbs(new BigDecimal("0.0"))
                    .confidence(new BigDecimal("0.85"))
                    .build()
            ))
            .build();

        // When
        mockMvc.perform(post("/api/v1/meals")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk());

        // Then: Verify JSONB was stored correctly
        MealLog saved = mealLogRepository.findAll().get(0);
        assertThat(saved.getFoodItems()).isNotNull();
        assertThat(saved.getFoodItems()).contains("beef");
        assertThat(saved.getFoodItems()).contains("牛肉");
    }
}
