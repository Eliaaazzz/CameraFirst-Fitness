package com.fitnessapp.backend.nutrition.service.core;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.fitnessapp.backend.nutrition.dto.FoodRecognitionRequestMetadata;
import com.fitnessapp.backend.nutrition.dto.FoodRecognitionResult;
import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.dto.RecognizedFood;

@DisplayName("CaloriePhysicsRefinementService Tests")
class CaloriePhysicsRefinementServiceTest {

    // Default production-like config: blendWeight 0.5, volumeBias 1.32, clamp [0.4, 2.5].
    private final CaloriePhysicsRefinementService service =
            new CaloriePhysicsRefinementService(new FoodCategoryClassifier(), true, 0.5, 1.32, 0.4, 2.5);

    // --- helpers ---
    private static RecognizedFood food(String name, int grams, int kcal) {
        return RecognizedFood.builder()
                .displayName(name)
                .estimatedGrams(grams)
                .nutrition(NutritionInfo.builder()
                        .calories(BigDecimal.valueOf(kcal))
                        .protein(BigDecimal.valueOf(10))
                        .carbs(BigDecimal.valueOf(20))
                        .fat(BigDecimal.valueOf(5))
                        .build())
                .build();
    }

    private static FoodRecognitionResult result(RecognizedFood... items) {
        return FoodRecognitionResult.builder().items(List.of(items)).sceneType("single_dish").build();
    }

    private static FoodRecognitionRequestMetadata volume(Double cm3) {
        FoodRecognitionRequestMetadata m = new FoodRecognitionRequestMetadata();
        m.setVolumeCm3(cm3);
        return m;
    }

    private static int kcal(RecognizedFood f) {
        return f.getNutrition().getCalories().intValue();
    }

    // --- no-op safety ---

    @Test
    @DisplayName("no-op when metadata carries no volume")
    void noOpWithoutVolume() {
        FoodRecognitionResult r = result(food("Steak", 200, 400));
        service.refine(r, new FoodRecognitionRequestMetadata());
        assertThat(kcal(r.getItems().get(0))).isEqualTo(400);
        assertThat(r.getItems().get(0).getEstimatedGrams()).isEqualTo(200);
    }

    @Test
    @DisplayName("no-op when metadata is null")
    void noOpWithNullMetadata() {
        FoodRecognitionResult r = result(food("Steak", 200, 400));
        assertThat(service.refine(r, null)).isSameAs(r);
        assertThat(kcal(r.getItems().get(0))).isEqualTo(400);
    }

    @Test
    @DisplayName("no-op when disabled by config")
    void noOpWhenDisabled() {
        CaloriePhysicsRefinementService disabled =
                new CaloriePhysicsRefinementService(new FoodCategoryClassifier(), false, 0.5, 1.32, 0.4, 2.5);
        FoodRecognitionResult r = result(food("Steak", 200, 400));
        disabled.refine(r, volume(100.0));
        assertThat(kcal(r.getItems().get(0))).isEqualTo(400);
    }

    @Test
    @DisplayName("no-op on non-positive volume")
    void noOpOnZeroVolume() {
        FoodRecognitionResult r = result(food("Steak", 200, 400));
        service.refine(r, volume(0.0));
        assertThat(kcal(r.getItems().get(0))).isEqualTo(400);
    }

    // --- correction math ---

    @Test
    @DisplayName("scales DOWN when the model over-estimates portion (small volume)")
    void scalesDownOnOverEstimate() {
        // Steak (density 1.02), flash 200g/400kcal (2.0 kcal/g), volume 100cm3.
        // volCorr=75.76, mass=77.27, physKcal=154.55, blend=sqrt(400*154.55)=248.6, scale=0.6216.
        FoodRecognitionResult r = result(food("Grilled steak", 200, 400));
        service.refine(r, volume(100.0));
        assertThat(kcal(r.getItems().get(0))).isEqualTo(249);
        assertThat(r.getItems().get(0).getEstimatedGrams()).isEqualTo(124);
    }

    @Test
    @DisplayName("scales UP when the model under-estimates portion (large volume)")
    void scalesUpOnUnderEstimate() {
        // Rice (density 0.55), flash 100g/100kcal (1.0 kcal/g), volume 500cm3.
        // volCorr=378.8, mass=208.3, physKcal=208.3, blend=sqrt(100*208.3)=144.3, scale=1.443.
        FoodRecognitionResult r = result(food("Jasmine rice", 100, 100));
        service.refine(r, volume(500.0));
        assertThat(kcal(r.getItems().get(0))).isEqualTo(144);
        assertThat(r.getItems().get(0).getEstimatedGrams()).isEqualTo(144);
    }

    @Test
    @DisplayName("per-food density changes the correction (salad vs steak at same volume)")
    void densityAffectsCorrection() {
        FoodRecognitionResult salad = result(food("Garden salad", 200, 400));
        FoodRecognitionResult steak = result(food("Ribeye steak", 200, 400));
        service.refine(salad, volume(300.0));
        service.refine(steak, volume(300.0));
        // Same flash numbers + same volume, but salad is far less dense → lower mass → lower calories.
        assertThat(kcal(salad.getItems().get(0))).isLessThan(kcal(steak.getItems().get(0)));
    }

    @Test
    @DisplayName("extreme volume is clamped by max-scale")
    void clampsRunawayScale() {
        FoodRecognitionResult r = result(food("Cake", 100, 100));
        service.refine(r, volume(100000.0));
        // scale would be >20x; clamped to 2.5 → 250 kcal.
        assertThat(kcal(r.getItems().get(0))).isEqualTo(250);
        assertThat(r.getItems().get(0).getEstimatedGrams()).isEqualTo(250);
    }

    @Test
    @DisplayName("multi-item scenes scale uniformly, preserving per-item ratios")
    void multiItemPreservesRatios() {
        FoodRecognitionResult r = result(food("Steak", 200, 400), food("Rice", 100, 100));
        service.refine(r, volume(200.0));
        int a = kcal(r.getItems().get(0));
        int b = kcal(r.getItems().get(1));
        // 400:100 == 4:1 ratio preserved under a single scene scale.
        assertThat((double) a / b).isCloseTo(4.0, org.assertj.core.data.Offset.offset(0.05));
    }

    @Test
    @DisplayName("robust to items with null nutrition or missing grams")
    void robustToPartialItems() {
        RecognizedFood noNutrition = RecognizedFood.builder().displayName("Garnish").estimatedGrams(5).build();
        RecognizedFood valid = food("Steak", 200, 400);
        FoodRecognitionResult r = FoodRecognitionResult.builder()
                .items(List.of(noNutrition, valid)).sceneType("multi_dish").build();
        service.refine(r, volume(100.0)); // must not throw
        assertThat(kcal(r.getItems().get(1))).isEqualTo(249);
    }

    @Test
    @DisplayName("weight=1.0 keeps the model estimate (pure flash), weight=0.0 is pure physics")
    void blendWeightExtremes() {
        CaloriePhysicsRefinementService pureFlash =
                new CaloriePhysicsRefinementService(new FoodCategoryClassifier(), true, 1.0, 1.32, 0.1, 5.0);
        FoodRecognitionResult r1 = result(food("Steak", 200, 400));
        pureFlash.refine(r1, volume(100.0));
        assertThat(kcal(r1.getItems().get(0))).isEqualTo(400); // unchanged

        CaloriePhysicsRefinementService purePhysics =
                new CaloriePhysicsRefinementService(new FoodCategoryClassifier(), true, 0.0, 1.32, 0.1, 5.0);
        FoodRecognitionResult r2 = result(food("Steak", 200, 400));
        purePhysics.refine(r2, volume(100.0));
        // physicsKcal ≈ 154.5 → 155
        assertThat(kcal(r2.getItems().get(0))).isEqualTo(155);
    }
}
