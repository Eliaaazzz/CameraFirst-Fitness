package com.fitnessapp.backend.recommendation;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitnessapp.backend.embedding.EmbeddingGenerationException;
import com.fitnessapp.backend.embedding.EmbeddingService;
import com.fitnessapp.backend.recipe.entity.Recipe;
import com.fitnessapp.backend.recipe.repository.RecipeRepository;
import com.fitnessapp.backend.workout.entity.ExerciseVideo;
import com.fitnessapp.backend.workout.repository.ExerciseVideoRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for seeding embeddings for exercise videos and recipes.
 * Generates vector embeddings for content-based semantic recommendations.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContentEmbeddingSeeder {

    private static final int BATCH_SIZE = 10;

    private final EmbeddingService embeddingService;
    private final ExerciseVideoRepository exerciseVideoRepository;
    private final RecipeRepository recipeRepository;

    /**
     * Seed embeddings for all exercise videos without embeddings.
     *
     * @return Number of videos processed
     */
    @Transactional
    public int seedVideoEmbeddings() {
        List<ExerciseVideo> videos = exerciseVideoRepository.findVideosWithoutEmbeddings();
        log.info("Found {} videos without embeddings", videos.size());

        AtomicInteger processed = new AtomicInteger(0);

        for (ExerciseVideo video : videos) {
            try {
                String searchText = buildVideoSearchText(video);
                float[] embedding = embeddingService.generateEmbedding(searchText);

                String embeddingString = toVectorString(embedding);
                exerciseVideoRepository.updateEmbedding(
                        video.getId(),
                        embeddingString,
                        searchText,
                        OffsetDateTime.now()
                );
                processed.incrementAndGet();

                if (processed.get() % BATCH_SIZE == 0) {
                    log.info("Processed {} video embeddings...", processed.get());
                }
            } catch (EmbeddingGenerationException e) {
                log.warn("Embedding generation failed for video {} ({}): {}",
                        video.getExerciseName(), e.getErrorType(), e.getMessage());
            } catch (Exception e) {
                log.error("Error processing video {}: {}", video.getId(), e.getMessage());
            }
        }

        log.info("Completed video embedding seeding: {} processed", processed.get());
        return processed.get();
    }

    /**
     * Seed embeddings for all recipes without embeddings.
     *
     * @return Number of recipes processed
     */
    @Transactional
    public int seedRecipeEmbeddings() {
        List<Recipe> recipes = recipeRepository.findRecipesWithoutEmbeddings();
        log.info("Found {} recipes without embeddings", recipes.size());

        AtomicInteger processed = new AtomicInteger(0);

        for (Recipe recipe : recipes) {
            try {
                String searchText = buildRecipeSearchText(recipe);
                float[] embedding = embeddingService.generateEmbedding(searchText);

                String embeddingString = toVectorString(embedding);
                recipeRepository.updateEmbedding(
                        recipe.getId(),
                        embeddingString,
                        searchText,
                        OffsetDateTime.now()
                );
                processed.incrementAndGet();

                if (processed.get() % BATCH_SIZE == 0) {
                    log.info("Processed {} recipe embeddings...", processed.get());
                }
            } catch (EmbeddingGenerationException e) {
                log.warn("Embedding generation failed for recipe {} ({}): {}",
                        recipe.getTitle(), e.getErrorType(), e.getMessage());
            } catch (Exception e) {
                log.error("Error processing recipe {}: {}", recipe.getId(), e.getMessage());
            }
        }

        log.info("Completed recipe embedding seeding: {} processed", processed.get());
        return processed.get();
    }

    /**
     * Seed all content embeddings (videos + recipes).
     *
     * @return Total number of items processed
     */
    public int seedAllEmbeddings() {
        int videos = seedVideoEmbeddings();
        int recipes = seedRecipeEmbeddings();
        return videos + recipes;
    }

    /**
     * Seed all embeddings asynchronously in background.
     */
    @Async
    public void seedAllEmbeddingsAsync() {
        log.info("Starting async content embedding seeding...");
        int total = seedAllEmbeddings();
        log.info("Async content embedding seeding completed: {} total items", total);
    }

    /**
     * Get embedding statistics for content.
     */
    public ContentEmbeddingStats getStats() {
        long videosWithEmbedding = exerciseVideoRepository.countByEmbeddingIsNotNull();
        long videosTotal = exerciseVideoRepository.count();
        long recipesWithEmbedding = recipeRepository.countByEmbeddingIsNotNull();
        long recipesTotal = recipeRepository.count();

        return new ContentEmbeddingStats(
                videosWithEmbedding,
                videosTotal,
                recipesWithEmbedding,
                recipesTotal,
                embeddingService.getModelName(),
                embeddingService.getDimensions()
        );
    }

    // ============================================================================
    // Helper Methods
    // ============================================================================

    private String buildVideoSearchText(ExerciseVideo video) {
        StringBuilder sb = new StringBuilder();
        sb.append(video.getExerciseName()).append(" ");
        sb.append(video.getPrimaryCategory()).append(" ");

        if (video.getSecondaryCategory() != null) {
            sb.append(video.getSecondaryCategory()).append(" ");
        }

        if (video.getIsShort()) {
            sb.append("quick short workout ");
        } else {
            sb.append("full workout exercise ");
        }

        if (video.getTargetGoal() != null) {
            for (String goal : video.getTargetGoal()) {
                sb.append(goalToDescription(goal)).append(" ");
            }
        }

        return sb.toString().trim();
    }

    private String buildRecipeSearchText(Recipe recipe) {
        StringBuilder sb = new StringBuilder();
        sb.append(recipe.getTitle()).append(" ");
        sb.append(recipe.getDifficulty()).append(" ");

        // Add nutritional characteristics
        if (recipe.getNutritionSummary() != null) {
            var ns = recipe.getNutritionSummary();

            if (ns.has("protein")) {
                double protein = ns.get("protein").asDouble();
                if (protein >= 30) {
                    sb.append("high protein muscle building ");
                } else if (protein >= 20) {
                    sb.append("good protein ");
                }
            }

            if (ns.has("calories")) {
                int calories = ns.get("calories").asInt();
                if (calories < 300) {
                    sb.append("low calorie diet weight loss ");
                } else if (calories < 500) {
                    sb.append("moderate calorie ");
                } else {
                    sb.append("high calorie bulking ");
                }
            }

            if (ns.has("carbs")) {
                double carbs = ns.get("carbs").asDouble();
                if (carbs < 20) {
                    sb.append("low carb keto ");
                }
            }
        }

        if (recipe.getTargetGoal() != null) {
            for (String goal : recipe.getTargetGoal()) {
                sb.append(goalToDescription(goal)).append(" ");
            }
        }

        return sb.toString().trim();
    }

    private String goalToDescription(String goal) {
        return switch (goal.toUpperCase()) {
            case "LOSE_WEIGHT" -> "weight loss fat burning lean";
            case "GAIN_MUSCLE" -> "muscle building mass gain hypertrophy";
            case "STRENGTH" -> "strength training power lifting";
            case "MAINTAIN" -> "maintain health wellness balance";
            default -> goal.toLowerCase().replace("_", " ");
        };
    }

    private String toVectorString(float[] embedding) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < embedding.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(String.format("%.8f", embedding[i]));
        }
        sb.append("]");
        return sb.toString();
    }

    /**
     * Statistics record for content embeddings.
     */
    public record ContentEmbeddingStats(
            long videosWithEmbedding,
            long videosTotal,
            long recipesWithEmbedding,
            long recipesTotal,
            String embeddingModel,
            int embeddingDimensions
    ) {
        public double videoCoverage() {
            return videosTotal > 0 ? (double) videosWithEmbedding / videosTotal * 100 : 0;
        }

        public double recipeCoverage() {
            return recipesTotal > 0 ? (double) recipesWithEmbedding / recipesTotal * 100 : 0;
        }

        public boolean isReady() {
            return videosWithEmbedding > 0 && recipesWithEmbedding > 0;
        }
    }
}
