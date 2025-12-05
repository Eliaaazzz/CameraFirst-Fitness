package com.fitnessapp.backend.nutrition;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.domain.User;
import com.fitnessapp.backend.domain.UserProfile;
import com.fitnessapp.backend.nutrition.dto.CreateMealRequest;
import com.fitnessapp.backend.nutrition.dto.FoodRecognitionResult;
import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.dto.RecognizedFood;
import com.fitnessapp.backend.nutrition.service.FoodRecognitionService;
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
 * 2. Gemini (or fallback) recognizes foods
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
    private FoodRecognitionService foodRecognitionService;

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

        // Mock AI recognition
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

        when(foodRecognitionService.recognizeFoods(any(MultipartFile.class)))
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
                    .calories(80.0)
                    .protein(3.0)
                    .fat(5.0)
                    .carbs(7.0)
                    .confidence(0.88)
                    .build()
            ))
            .build();

        mockMvc.perform(post("/api/v1/nutrition/meals")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(saveMealRequest)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.mealType").value("lunch"))
            .andExpect(jsonPath("$.calories").value(511));

        // ========================================
        // STEP 4: Dashboard shows updated daily intake
        // ========================================
        mockMvc.perform(get("/api/v1/nutrition/summary/daily")
                .param("userId", testUser.getId().toString()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalCalories.actual").exists())
            .andExpect(jsonPath("$.totalProtein.actual").exists())
            .andExpect(jsonPath("$.meals", hasSize(1)));
    }
}
