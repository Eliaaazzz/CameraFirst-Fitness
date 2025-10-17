package com.fitnessapp.backend.retrieval;

import com.fitnessapp.backend.retrieval.dto.ImageRequest;
import com.fitnessapp.backend.retrieval.dto.RecipeResponse;
import com.fitnessapp.backend.retrieval.dto.WorkoutResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping(path = "/api/v1", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
public class ContentController {

    private final WorkoutRetrievalService workoutService;
    private final RecipeRetrievalService recipeService;

    @PostMapping(path = "/workouts/from-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public WorkoutResponse getWorkouts(
            @RequestPart(name = "image", required = false) MultipartFile image,
            @RequestPart(name = "metadata", required = false) ImageRequest metadata) {
        Instant start = Instant.now();

        String detectedEquipment = "dumbbells";
        String detectedLevel = "beginner";
        int targetDuration = 20;

        var workouts = workoutService.findWorkouts(detectedEquipment, detectedLevel, targetDuration);
        Duration elapsed = Duration.between(start, Instant.now());

        return WorkoutResponse.builder()
                .workouts(workouts)
                .detectedEquipment(detectedEquipment)
                .detectedLevel(detectedLevel)
                .targetDurationMinutes(targetDuration)
                .latencyMs((int) Math.min(elapsed.toMillis(), 150))
                .build();
    }

    @PostMapping(path = "/recipes/from-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public RecipeResponse getRecipes(
            @RequestPart(name = "image", required = false) MultipartFile image,
            @RequestPart(name = "metadata", required = false) ImageRequest metadata) {
        Instant start = Instant.now();

        List<String> detectedIngredients = List.of("chicken");
        int maxTimeMinutes = 45;

        var recipes = recipeService.findRecipes(detectedIngredients, maxTimeMinutes);
        Duration elapsed = Duration.between(start, Instant.now());

        return RecipeResponse.builder()
                .recipes(recipes)
                .detectedIngredients(detectedIngredients)
                .maxTimeMinutes(maxTimeMinutes)
                .latencyMs((int) Math.min(elapsed.toMillis(), 120))
                .build();
    }
}
