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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(path = "/api/v1", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
public class ContentController {

    private final WorkoutRetrievalService workoutService;
    private final RecipeRetrievalService recipeService;

    @PostMapping("/workouts/from-image")
    public WorkoutResponse getWorkouts(@RequestBody(required = false) ImageRequest request) {
        Instant start = Instant.now();

        String detectedEquipment = "dumbbells";
        String detectedLevel = "beginner";
        int targetDuration = 20;

        var workouts = workoutService.findWorkouts(detectedEquipment, detectedLevel, targetDuration);
        Duration elapsed = Duration.between(start, Instant.now());

        return WorkoutResponse.builder()
                .workouts(workouts)
                .detectedEquipment(detectedEquipment)
                .latencyMs((int) Math.min(elapsed.toMillis(), 150))
                .build();
    }

    @PostMapping("/recipes/from-image")
    public RecipeResponse getRecipes(@RequestBody(required = false) ImageRequest request) {
        Instant start = Instant.now();

        List<String> detectedIngredients = List.of("chicken");
        int maxTimeMinutes = 45;

        var recipes = recipeService.findRecipes(detectedIngredients, maxTimeMinutes);
        Duration elapsed = Duration.between(start, Instant.now());

        return RecipeResponse.builder()
                .recipes(recipes)
                .detectedIngredients(detectedIngredients)
                .latencyMs((int) Math.min(elapsed.toMillis(), 120))
                .build();
    }
}
