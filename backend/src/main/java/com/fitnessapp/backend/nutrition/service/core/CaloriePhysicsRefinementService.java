package com.fitnessapp.backend.nutrition.service.core;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fitnessapp.backend.nutrition.dto.FoodRecognitionRequestMetadata;
import com.fitnessapp.backend.nutrition.dto.FoodRecognitionResult;
import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.dto.RecognizedFood;

import lombok.extern.slf4j.Slf4j;

/**
 * Refines a meal's portion (and therefore calories) using an absolute LiDAR-measured
 * food volume, keeping the vision model's food identity and energy density.
 *
 * <p><b>Why.</b> Benchmarks (docs/calorie-accuracy-roadmap-25-to-15.md §10) show the vision
 * model is good at food identity and energy density (kcal/g) but bad at grams — portion/mass
 * is the dominant calorie error. Absolute volume from LiDAR fixes grams, and the oracle "perfect
 * mass × the model's own energy density" lands at 5–16% median APE. This service implements the
 * physics decomposition that path implies, in a way that <b>generalizes with no in-domain
 * calibration</b>: mass comes from geometry + a food-intrinsic density table, energy density from
 * the model, and the two independent calorie estimates are combined by a log-space geometric mean.
 *
 * <p><b>What it does (scene level).</b> The on-device module emits one scene volume, so this applies
 * a single scene-level portion correction:
 * <pre>
 *   physicsMass  = (volume_cm3 / volumeBias) × massWeightedDensity(items)
 *   physicsKcal  = physicsMass × sceneEnergyDensity            // sceneEnergyDensity = ΣkcalΣ / ΣmassΣ
 *   blendedKcal  = flashKcal^w × physicsKcal^(1-w)             // geometric mean, w = blendWeight
 *   scale        = clamp(blendedKcal / flashKcal, minScale, maxScale)
 * </pre>
 * and multiplies every item's grams and mass-proportional nutrition by {@code scale}. Energy density
 * per item is preserved (identity and kcal/g are the model's strengths); only portion is corrected.
 *
 * <p><b>Safety.</b> It is a strict no-op when disabled, when no positive volume is supplied
 * (non-LiDAR devices, web, gallery photos), or when the model returned no usable calories/grams —
 * so behaviour is never worse than the model alone. {@code volumeBias} converts the geometric
 * (height-map) volume, which systematically over-reads ~1.32×, to a true-volume basis; it is a
 * single global constant, not a per-domain fit.
 */
@Slf4j
@Service
public class CaloriePhysicsRefinementService {

    private final FoodCategoryClassifier classifier;
    private final boolean enabled;
    private final double blendWeight;   // weight on the model's own calorie estimate, in [0, 1]
    private final double volumeBias;    // geometric-volume → true-volume divisor (>0)
    private final double minScale;
    private final double maxScale;

    /** Below this relative change, skip rewriting the estimate to avoid needless rounding churn. */
    private static final double SCALE_EPSILON = 0.005;

    /** A whole-meal scene volume below this (cm³) is treated as a noise reading and skipped. */
    private static final double MIN_VOLUME_CM3 = 2.0;

    public CaloriePhysicsRefinementService(
            FoodCategoryClassifier classifier,
            @Value("${app.nutrition.physics-refine.enabled:true}") boolean enabled,
            @Value("${app.nutrition.physics-refine.blend-weight:0.5}") double blendWeight,
            @Value("${app.nutrition.physics-refine.volume-bias:1.32}") double volumeBias,
            @Value("${app.nutrition.physics-refine.min-scale:0.4}") double minScale,
            @Value("${app.nutrition.physics-refine.max-scale:2.5}") double maxScale) {
        this.classifier = classifier;
        this.enabled = enabled;
        this.blendWeight = Double.isFinite(blendWeight) ? clamp(blendWeight, 0.0, 1.0) : 0.5;
        this.volumeBias = (Double.isFinite(volumeBias) && volumeBias > 0) ? volumeBias : 1.32;
        double lo = (Double.isFinite(minScale) && minScale > 0) ? minScale : 0.4;
        double hi = (Double.isFinite(maxScale) && maxScale > 0) ? maxScale : 2.5;
        if (hi < lo) { // inconsistent pair (e.g. min=3, max=2) → reset both to safe defaults
            lo = 0.4;
            hi = 2.5;
        }
        this.minScale = lo;
        this.maxScale = hi;
    }

    /**
     * Return a portion-refined copy of {@code result} using the LiDAR volume in {@code metadata},
     * or {@code result} unchanged when refinement does not apply.
     */
    public FoodRecognitionResult refine(FoodRecognitionResult result, FoodRecognitionRequestMetadata metadata) {
        if (!enabled || result == null || metadata == null) {
            return result;
        }
        Double volume = metadata.resolveVolumeCm3();
        if (volume == null || volume < MIN_VOLUME_CM3) {
            return result;
        }
        List<RecognizedFood> items = result.getItems();
        if (items == null || items.isEmpty()) {
            return result;
        }

        double flashKcal = 0.0;
        double flashMass = 0.0;
        double densityMass = 0.0; // Σ grams_i × density_i, for the mass-weighted density
        for (RecognizedFood item : items) {
            double grams = grams(item);
            double kcal = calories(item);
            // Only items with both grams and calories inform the scene energy density and mass; an
            // item with unknown nutrition still gets its grams scaled below, but must not skew the
            // correction (e.g. a 0-kcal garnish should not drag the scene's kcal/g down).
            if (grams > 0 && kcal > 0) {
                flashKcal += kcal;
                flashMass += grams;
                densityMass += grams * classifier.densityGramsPerCm3(displayName(item));
            }
        }

        if (flashKcal <= 0 || flashMass <= 0 || densityMass <= 0) {
            return result;
        }

        double sceneEnergyDensity = flashKcal / flashMass;          // kcal per gram
        double massWeightedDensity = densityMass / flashMass;        // g per cm³
        double physicsMass = (volume / volumeBias) * massWeightedDensity;
        double physicsKcal = physicsMass * sceneEnergyDensity;
        if (physicsKcal <= 0) {
            return result;
        }

        // Geometric mean of two partially-independent calorie estimates (model vs geometry).
        double blendedKcal = Math.exp(blendWeight * Math.log(flashKcal)
                + (1.0 - blendWeight) * Math.log(physicsKcal));
        double scale = clamp(blendedKcal / flashKcal, minScale, maxScale);

        if (Math.abs(scale - 1.0) < SCALE_EPSILON) {
            return result;
        }

        for (RecognizedFood item : items) {
            applyScale(item, scale);
        }

        log.info("Physics portion-refine: volume={}cm3 dens={}g/cm3 flashKcal={} physicsKcal={} scale={} items={}",
                round1(volume), round3(massWeightedDensity), Math.round(flashKcal),
                Math.round(physicsKcal), round3(scale), items.size());
        return result;
    }

    private void applyScale(RecognizedFood item, double scale) {
        if (item == null) {
            return;
        }
        Integer grams = item.getEstimatedGrams();
        if (grams != null && grams > 0) {
            item.setEstimatedGrams(Math.max(1, (int) Math.round(grams * scale)));
        }
        NutritionInfo n = item.getNutrition();
        if (n == null) {
            return;
        }
        n.setCalories(scaleValue(n.getCalories(), scale, 0));
        n.setProtein(scaleValue(n.getProtein(), scale, 1));
        n.setFat(scaleValue(n.getFat(), scale, 1));
        n.setCarbs(scaleValue(n.getCarbs(), scale, 1));
        n.setFiber(scaleValue(n.getFiber(), scale, 1));
        n.setSugar(scaleValue(n.getSugar(), scale, 1));
        n.setNetCarbs(scaleValue(n.getNetCarbs(), scale, 1));
        n.setSugarCubes(scaleValue(n.getSugarCubes(), scale, 1));
        // Glycemic index is intensive (unaffected by portion); glycemic load scales with net carbs.
        n.setGlycemicLoad(scaleValue(n.getGlycemicLoad(), scale, 1));
    }

    private static BigDecimal scaleValue(BigDecimal value, double scale, int decimals) {
        if (value == null) {
            return null;
        }
        return value.multiply(BigDecimal.valueOf(scale)).setScale(decimals, RoundingMode.HALF_UP);
    }

    private static double grams(RecognizedFood item) {
        Integer g = item == null ? null : item.getEstimatedGrams();
        return g != null && g > 0 ? g : 0.0;
    }

    private static double calories(RecognizedFood item) {
        if (item == null || item.getNutrition() == null || item.getNutrition().getCalories() == null) {
            return 0.0;
        }
        double c = item.getNutrition().getCalories().doubleValue();
        return c > 0 ? c : 0.0;
    }

    private static String displayName(RecognizedFood item) {
        return item == null ? null : item.getDisplayName();
    }

    private static double clamp(double v, double lo, double hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    private static double round3(double v) {
        return Math.round(v * 1000.0) / 1000.0;
    }
}
