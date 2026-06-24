package com.fitnessapp.backend.recommendation.hybrid;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import com.fitnessapp.backend.recipe.entity.Recipe;
import com.fitnessapp.backend.recipe.repository.RecipeRepository;
import com.fitnessapp.backend.recipe.repository.UserSavedRecipeRepository;
import com.fitnessapp.backend.recommendation.VectorRecommendationService;
import com.fitnessapp.backend.recommendation.hybrid.ReciprocalRankFusion.RankedItem;
import com.fitnessapp.backend.retrieval.dto.RecipeCard;
import com.fitnessapp.backend.social.repository.FollowRepository;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;

/**
 * Hybrid recipe recommender: fuses CONTENT similarity (pgvector ANN over recipe embeddings) with a
 * COLLABORATIVE signal (recipes saved by the people you follow) using Reciprocal Rank Fusion.
 *
 * <p>This is the "社交推荐" core: a recipe that is both semantically relevant AND popular among your
 * social graph ranks highest. Degrades gracefully — if the vector path is unavailable it falls back to
 * the collaborative signal, and vice-versa.</p>
 */
@Slf4j
@Service
public class HybridRecommenderService {

    private static final int CANDIDATES_PER_SIGNAL = 30;

    private final VectorRecommendationService vectorRecommendationService;
    private final UserSavedRecipeRepository userSavedRecipeRepository;
    private final FollowRepository followRepository;
    private final RecipeRepository recipeRepository;
    private final MeterRegistry meterRegistry;

    public HybridRecommenderService(VectorRecommendationService vectorRecommendationService,
                                    UserSavedRecipeRepository userSavedRecipeRepository,
                                    FollowRepository followRepository,
                                    RecipeRepository recipeRepository,
                                    MeterRegistry meterRegistry) {
        this.vectorRecommendationService = vectorRecommendationService;
        this.userSavedRecipeRepository = userSavedRecipeRepository;
        this.followRepository = followRepository;
        this.recipeRepository = recipeRepository;
        this.meterRegistry = meterRegistry;
    }

    public List<HybridRecipe> recommend(UUID userId, String query, String goalFilter, int limit) {
        int n = Math.max(1, Math.min(limit, 25));

        // --- Content signal: pgvector ANN over recipe embeddings ---
        Map<String, RecipeCard> cardsById = new LinkedHashMap<>();
        List<String> contentIds = new ArrayList<>();
        try {
            for (RecipeCard card : vectorRecommendationService.getRecipeRecommendations(query, goalFilter)) {
                if (card.getId() != null) {
                    cardsById.putIfAbsent(card.getId(), card);
                    contentIds.add(card.getId());
                }
            }
        } catch (Exception e) {
            log.debug("Content (vector) recommendation unavailable, using collaborative signal only: {}",
                    e.getMessage());
        }

        // --- Collaborative signal: recipes saved by people the user follows ---
        List<String> socialIds = new ArrayList<>();
        List<UUID> followees = followRepository.findFolloweeIds(userId);
        if (!followees.isEmpty()) {
            for (UUID id : userSavedRecipeRepository.findRecipeIdsSavedByUsers(
                    followees, PageRequest.of(0, CANDIDATES_PER_SIGNAL))) {
                socialIds.add(id.toString());
            }
        }

        // --- Fuse with RRF ---
        List<RankedItem<String>> fused = ReciprocalRankFusion.fuse(List.of(contentIds, socialIds));
        List<RankedItem<String>> top = fused.stream().limit(n).toList();

        // Resolve titles for collaborative-only ids (not present in the content cards).
        Map<String, Recipe> recipesById = resolveMissingRecipes(top, cardsById);

        List<HybridRecipe> result = new ArrayList<>();
        for (RankedItem<String> item : top) {
            RecipeCard card = cardsById.get(item.id());
            String title = card != null ? card.getTitle()
                    : recipesById.containsKey(item.id()) ? recipesById.get(item.id()).getTitle() : "Recipe";
            Double similarity = card != null ? card.getSimilarityScore() : null;
            List<String> signals = new ArrayList<>();
            if (item.sourceLists().contains(0)) {
                signals.add("content");
            }
            if (item.sourceLists().contains(1)) {
                signals.add("social");
            }
            result.add(new HybridRecipe(item.id(), title, similarity, item.score(), signals));
        }
        meterRegistry.counter("aura.recommend.hybrid",
                "had_social", String.valueOf(!socialIds.isEmpty())).increment();
        return result;
    }

    private Map<String, Recipe> resolveMissingRecipes(List<RankedItem<String>> top, Map<String, RecipeCard> cardsById) {
        List<UUID> missing = new ArrayList<>();
        for (RankedItem<String> item : top) {
            if (!cardsById.containsKey(item.id())) {
                try {
                    missing.add(UUID.fromString(item.id()));
                } catch (IllegalArgumentException ignored) {
                    // non-UUID id from content card; skip resolution
                }
            }
        }
        Map<String, Recipe> byId = new LinkedHashMap<>();
        if (!missing.isEmpty()) {
            recipeRepository.findAllById(missing).forEach(r -> byId.put(r.getId().toString(), r));
        }
        return byId;
    }
}
