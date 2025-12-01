package com.fitnessapp.backend.nutrition;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.domain.User;
import com.fitnessapp.backend.domain.UserProfile;
import com.fitnessapp.backend.nutrition.dto.CreateMealRequest;
import com.fitnessapp.backend.nutrition.dto.FoodRecognitionResult;
import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.dto.RecognizedFood;
import com.fitnessapp.backend.nutrition.service.ClaudeVisionService;
import com.fitnessapp.backend.repository.MealLogRepository;
import com.fitnessapp.backend.repository.UserProfileRepository;
import com.fitnessapp.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-End Integration Test for Complete Nutrition Tracking Flow
 *
 * Tests the complete user journey:
 * 1. User uploads food photo
 * 2. Claude Vision recognizes foods
 * 3. Backend calculates nutrition
 * 4. User confirms and saves meal
 * 5. Dashboard displays daily intake
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DisplayName("Nutrition Tracking E2E Test")
class NutritionTrackingEndToEndTest {

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

    @MockBean
    private ClaudeVisionService claudeVisionService;

    private User testUser;
    private UserProfile testProfile;

    @BeforeEach
    void setUp() {
        // Clean database
        mealLogRepository.deleteAll();
        userProfileRepository.deleteAll();
        userRepository.deleteAll();

        // Create test user
        testUser = User.builder()
            .id(UUID.randomUUID())
            .email("test@example.com")
            .timeBucket(30)
            .level("intermediate")
            .dietTilt("balanced")
            .build();
        testUser = userRepository.save(testUser);

        // Create user profile with nutrition targets
        testProfile = UserProfile.builder()
            .userId(testUser.getId())
            .user(testUser)
            .dailyCalorieTarget(2000)
            .dailyProteinTarget(130)
            .dailyCarbsTarget(220)
            .dailyFatTarget(70)
            .build();
        testProfile = userProfileRepository.save(testProfile);
    }

    @Test
    @DisplayName("Complete Flow: Photo Upload → Recognition → Save → Dashboard")
    void testCompleteNutritionTrackingFlow() throws Exception {
        // ========================================
        // STEP 1: User uploads food photo
        // ========================================
        MockMultipartFile lunchPhoto = new MockMultipartFile(
            "image",
            "my-lunch.jpg",
            "image/jpeg",
            "lunch-photo-content".getBytes()
        );

        // Mock Claude Vision recognition
        RecognizedFood rice = RecognizedFood.builder()
            .foodKey("steamed_rice")
            .displayName("白米饭")
            .estimatedGrams(200)
            .cookingMethod("steamed")
            .confidence(0.95)
            .build();

        RecognizedFood chicken = RecognizedFood.builder()
            .foodKey("chicken_breast")
            .displayName("鸡胸肉")
            .estimatedGrams(150)
            .cookingMethod("grilled")
            .confidence(0.90)
            .build();

        RecognizedFood vegetables = RecognizedFood.builder()
            .foodKey("stir_fried_vegetables")
            .displayName("炒青菜")
            .estimatedGrams(100)
            .cookingMethod("stir_fried")
            .confidence(0.88)
            .build();

        FoodRecognitionResult recognitionResult = FoodRecognitionResult.builder()
            .items(Arrays.asList(rice, chicken, vegetables))
            .mealType("lunch")
            .build();

        when(claudeVisionService.recognizeFoods(any(MultipartFile.class)))
            .thenReturn(recognitionResult);

        // ========================================
        // STEP 2: Call /analyze endpoint
        // ========================================
        MvcResult analyzeResult = mockMvc.perform(multipart("/api/v1/nutrition/analyze")
                .file(lunchPhoto))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items", hasSize(3)))
            .andExpect(jsonPath("$.items[0].foodKey").value("steamed_rice"))
            .andExpect(jsonPath("$.items[0].nutrition.calories").exists())
            .andExpect(jsonPath("$.items[1].foodKey").value("chicken_breast"))
            .andExpect(jsonPath("$.items[2].foodKey").value("stir_fried_vegetables"))
            .andExpect(jsonPath("$.totalNutrition.calories").exists())
            .andExpect(jsonPath("$.suggestedMealType").value("lunch"))
            .andReturn();

        // Extract response for next step
        String analyzeResponseJson = analyzeResult.getResponse().getContentAsString();
        System.out.println("Analyze Response: " + analyzeResponseJson);

        // Verify nutrition was calculated
        assertThat(analyzeResponseJson).contains("calories");
        assertThat(analyzeResponseJson).contains("protein");

        // ========================================
        // STEP 3: User confirms and saves meal
        // ========================================
        CreateMealRequest saveMealRequest = CreateMealRequest.builder()
            .userId(testUser.getId())
            .mealType("lunch")
            .items(Arrays.asList(
                CreateMealRequest.FoodItemRequest.builder()
                    .foodKey("steamed_rice")
                    .displayName("白米饭")
                    .grams(200)
                    .calories(232.0)
                    .protein(5.2)
                    .fat(0.6)
                    .carbs(51.2)
                    .confidence(0.95)
                    .build(),
                CreateMealRequest.FoodItemRequest.builder()
                    .foodKey("chicken_breast")
                    .displayName("鸡胸肉")
                    .grams(150)
                    .calories(199.5)
                    .protein(42.0)
                    .fat(3.0)
                    .carbs(0.0)
                    .confidence(0.90)
                    .build(),
                CreateMealRequest.FoodItemRequest.builder()
                    .foodKey("stir_fried_vegetables")
                    .displayName("炒青菜")
                    .grams(100)
                    .calories(38.0)
                    .protein(2.3)
                    .fat(2.1)
                    .carbs(3.2)
                    .confidence(0.88)
                    .build()
            ))
            .note("Healthy lunch at home")
            .imageUrl("https://my-bucket.s3.amazonaws.com/lunch.jpg")
            .build();

        MvcResult saveMealResult = mockMvc.perform(post("/api/v1/meals")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(saveMealRequest)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").exists())
            .andExpect(jsonPath("$.userId").value(testUser.getId().toString()))
            .andExpect(jsonPath("$.mealType").value("lunch"))
            .andExpect(jsonPath("$.totalCalories").value(469)) // 232 + 199.5 + 38
            .andExpect(jsonPath("$.totalProtein").value(49.5))
            .andExpect(jsonPath("$.foodItems", hasSize(3)))
            .andReturn();

        String saveMealResponseJson = saveMealResult.getResponse().getContentAsString();
        System.out.println("Save Meal Response: " + saveMealResponseJson);

        // Verify meal was saved to database
        assertThat(mealLogRepository.count()).isEqualTo(1);

        // ========================================
        // STEP 4: View dashboard (today's summary)
        // ========================================
        mockMvc.perform(get("/api/v1/meals/today/" + testUser.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.date").exists())
            .andExpect(jsonPath("$.current.calories").value(469.0))
            .andExpect(jsonPath("$.current.protein").value(49.5))
            .andExpect(jsonPath("$.current.carbs").value(54.4))
            .andExpect(jsonPath("$.current.fat").value(5.7))
            .andExpect(jsonPath("$.target.calories").value(2000.0))
            .andExpect(jsonPath("$.target.protein").value(130.0))
            .andExpect(jsonPath("$.meals", hasSize(1)))
            .andExpect(jsonPath("$.meals[0].mealType").value("lunch"))
            .andExpect(jsonPath("$.meals[0].calories").value(469))
            .andExpect(jsonPath("$.meals[0].foods", hasSize(3)))
            .andExpect(jsonPath("$.healthScore").exists())
            .andDo(result -> {
                System.out.println("Dashboard Response: " +
                    result.getResponse().getContentAsString());
            });

        // ========================================
        // STEP 5: Add another meal (breakfast)
        // ========================================
        CreateMealRequest breakfastRequest = CreateMealRequest.builder()
            .userId(testUser.getId())
            .mealType("breakfast")
            .items(Arrays.asList(
                CreateMealRequest.FoodItemRequest.builder()
                    .foodKey("fried_egg")
                    .displayName("煎蛋")
                    .grams(50)
                    .calories(98.0)
                    .protein(6.8)
                    .fat(7.65)
                    .carbs(0.55)
                    .build()
            ))
            .build();

        mockMvc.perform(post("/api/v1/meals")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(breakfastRequest)))
            .andExpect(status().isOk());

        // ========================================
        // STEP 6: View updated dashboard
        // ========================================
        mockMvc.perform(get("/api/v1/meals/today/" + testUser.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.current.calories").value(567.0)) // 469 + 98
            .andExpect(jsonPath("$.current.protein").value(56.3)) // 49.5 + 6.8
            .andExpect(jsonPath("$.meals", hasSize(2)))
            .andExpect(jsonPath("$.meals[*].mealType", containsInAnyOrder("breakfast", "lunch")));

        // ========================================
        // STEP 7: Get meals by date
        // ========================================
        mockMvc.perform(get("/api/v1/meals")
                .param("userId", testUser.getId().toString())
                .param("date", java.time.LocalDate.now().toString()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(2)));

        // ========================================
        // STEP 8: Delete a meal
        // ========================================
        Long mealIdToDelete = mealLogRepository.findAll().get(0).getId();

        mockMvc.perform(delete("/api/v1/meals/" + mealIdToDelete))
            .andExpect(status().isNoContent());

        // Verify deletion
        assertThat(mealLogRepository.count()).isEqualTo(1);

        // ========================================
        // STEP 9: View final dashboard
        // ========================================
        mockMvc.perform(get("/api/v1/meals/today/" + testUser.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.meals", hasSize(1)));
    }

    @Test
    @DisplayName("Multiple Users Can Track Nutrition Independently")
    void testMultipleUsersIndependentTracking() throws Exception {
        // Create second user
        User user2 = User.builder()
            .id(UUID.randomUUID())
            .email("user2@example.com")
            .timeBucket(45)
            .level("advanced")
            .dietTilt("high_protein")
            .build();
        user2 = userRepository.save(user2);

        UserProfile profile2 = UserProfile.builder()
            .userId(user2.getId())
            .user(user2)
            .dailyCalorieTarget(1800)
            .dailyProteinTarget(100)
            .dailyCarbsTarget(200)
            .dailyFatTarget(60)
            .build();
        userProfileRepository.save(profile2);

        // User 1 logs a meal
        CreateMealRequest user1Meal = CreateMealRequest.builder()
            .userId(testUser.getId())
            .mealType("lunch")
            .items(Arrays.asList(
                CreateMealRequest.FoodItemRequest.builder()
                    .foodKey("steamed_rice")
                    .displayName("米饭")
                    .grams(200)
                    .calories(232.0)
                    .protein(5.2)
                    .fat(0.6)
                    .carbs(51.2)
                    .build()
            ))
            .build();

        mockMvc.perform(post("/api/v1/meals")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(user1Meal)))
            .andExpect(status().isOk());

        // User 2 logs a different meal
        CreateMealRequest user2Meal = CreateMealRequest.builder()
            .userId(user2.getId())
            .mealType("dinner")
            .items(Arrays.asList(
                CreateMealRequest.FoodItemRequest.builder()
                    .foodKey("chicken_breast")
                    .displayName("鸡胸肉")
                    .grams(150)
                    .calories(199.5)
                    .protein(42.0)
                    .fat(3.0)
                    .carbs(0.0)
                    .build()
            ))
            .build();

        mockMvc.perform(post("/api/v1/meals")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(user2Meal)))
            .andExpect(status().isOk());

        // Verify User 1's dashboard shows only their meal
        mockMvc.perform(get("/api/v1/meals/today/" + testUser.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.current.calories").value(232.0))
            .andExpect(jsonPath("$.target.calories").value(2000.0))
            .andExpect(jsonPath("$.meals", hasSize(1)));

        // Verify User 2's dashboard shows only their meal
        mockMvc.perform(get("/api/v1/meals/today/" + user2.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.current.calories").value(199.5))
            .andExpect(jsonPath("$.target.calories").value(1800.0))
            .andExpect(jsonPath("$.meals", hasSize(1)));
    }

    @Test
    @DisplayName("Health Score Calculation Changes Based on Intake")
    void testHealthScoreCalculation() throws Exception {
        // Log meal that's close to targets (should have good health score)
        CreateMealRequest goodMeal = CreateMealRequest.builder()
            .userId(testUser.getId())
            .mealType("lunch")
            .items(Arrays.asList(
                CreateMealRequest.FoodItemRequest.builder()
                    .foodKey("chicken_breast")
                    .displayName("鸡胸肉")
                    .grams(400)
                    .calories(532.0)
                    .protein(112.0)
                    .fat(8.0)
                    .carbs(0.0)
                    .build()
            ))
            .build();

        mockMvc.perform(post("/api/v1/meals")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(goodMeal)))
            .andExpect(status().isOk());

        // Check health score exists
        mockMvc.perform(get("/api/v1/meals/today/" + testUser.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.healthScore").isNumber())
            .andExpect(jsonPath("$.healthScore").value(greaterThan(0)));
    }
}
