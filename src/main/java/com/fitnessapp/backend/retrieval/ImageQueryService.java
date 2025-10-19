package com.fitnessapp.backend.retrieval;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fitnessapp.backend.domain.ImageQuery;
import com.fitnessapp.backend.retrieval.dto.ImageRequest;
import com.fitnessapp.backend.repository.ImageQueryRepository;
import java.util.ArrayList;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.OptionalInt;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.Value;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImageQueryService {

    private static final Map<String, String> EQUIPMENT_ALIASES = Map.ofEntries(
            Map.entry("dumbbell", "dumbbells"),
            Map.entry("dumbbells", "dumbbells"),
            Map.entry("kettlebell", "kettlebell"),
            Map.entry("kettlebells", "kettlebell"),
            Map.entry("resistance band", "resistance_bands"),
            Map.entry("resistance bands", "resistance_bands"),
            Map.entry("band", "resistance_bands"),
            Map.entry("yoga mat", "mat"),
            Map.entry("mat", "mat"),
            Map.entry("barbell", "barbell"),
            Map.entry("bodyweight", "bodyweight")
    );

    private static final List<String> FALLBACK_EQUIPMENT_PRIORITY = List.of(
            "dumbbells", "bodyweight", "resistance_bands", "kettlebell", "mat"
    );

    private static final Pattern DURATION_PATTERN = Pattern.compile("(\\d{2,3})\\s*(min|minutes|m)?");

    private static final Map<String, String> INGREDIENT_ALIASES = Map.ofEntries(
            Map.entry("chicken", "chicken"),
            Map.entry("salmon", "salmon"),
            Map.entry("tofu", "tofu"),
            Map.entry("shrimp", "shrimp"),
            Map.entry("turkey", "turkey"),
            Map.entry("beef", "beef"),
            Map.entry("steak", "beef"),
            Map.entry("broccoli", "broccoli"),
            Map.entry("quinoa", "quinoa"),
            Map.entry("rice", "rice"),
            Map.entry("pasta", "pasta"),
            Map.entry("egg", "eggs"),
            Map.entry("eggs", "eggs"),
            Map.entry("spinach", "spinach"),
            Map.entry("vegetable", "vegetable"),
            Map.entry("veggie", "vegetable")
    );

    private final ImageQueryRepository imageQueryRepository;
    private final ObjectMapper objectMapper;

    public WorkoutDetectionResult detectWorkoutContext(ImageRequest metadata) {
        List<String> rawHints = normalizeHints(metadata);

        String equipment = resolveEquipment(rawHints);
        String level = resolveLevel(rawHints);
        int duration = resolveDuration(rawHints);

        JsonNode storedHints = buildStoredHints(metadata, rawHints, equipment, level, duration);
        persistQuery("workout_image", storedHints);

        return new WorkoutDetectionResult(equipment, level, duration);
    }

    public RecipeDetectionResult detectRecipeContext(ImageRequest metadata) {
        List<String> rawHints = normalizeHints(metadata);
        List<String> ingredients = resolveIngredients(rawHints);
        int maxTime = resolveRecipeMaxTime(rawHints);
        JsonNode storedHints = buildRecipeHints(metadata, rawHints, ingredients, maxTime);
        persistQuery("recipe_image", storedHints);
        return new RecipeDetectionResult(ingredients, maxTime);
    }

    private void persistQuery(String type, JsonNode hints) {
        try {
            ImageQuery query = ImageQuery.builder()
                    .type(type)
                    .detectedHints(hints)
                    .build();
            imageQueryRepository.save(query);
        } catch (Exception ex) {
            log.warn("Failed to persist image query of type {}: {}", type, ex.getMessage());
        }
    }

    private List<String> normalizeHints(ImageRequest metadata) {
        if (metadata == null || CollectionUtils.isEmpty(metadata.getUserHints())) {
            return List.of();
        }
        List<String> sanitized = new ArrayList<>();
        for (String raw : metadata.getUserHints()) {
            if (!StringUtils.hasText(raw)) {
                continue;
            }
            sanitized.add(raw.trim().toLowerCase(Locale.ROOT));
        }
        return sanitized;
    }

    private String resolveEquipment(List<String> hints) {
        for (String hint : hints) {
            String normalized = EQUIPMENT_ALIASES.get(hint);
            if (normalized != null) {
                return normalized;
            }
        }
        // attempt partial matches
        for (String hint : hints) {
            for (Map.Entry<String, String> alias : EQUIPMENT_ALIASES.entrySet()) {
                if (hint.contains(alias.getKey())) {
                    return alias.getValue();
                }
            }
        }
        return FALLBACK_EQUIPMENT_PRIORITY.stream().findFirst().orElse("bodyweight");
    }

    private String resolveLevel(List<String> hints) {
        for (String hint : hints) {
            if (hint.contains("advanced")) {
                return "advanced";
            }
            if (hint.contains("intermediate")) {
                return "intermediate";
            }
            if (hint.contains("beginner") || hint.contains("easy")) {
                return "beginner";
            }
        }
        return "beginner";
    }

    private int resolveDuration(List<String> hints) {
        for (String hint : hints) {
            OptionalInt parsed = parseDuration(hint);
            if (parsed.isPresent()) {
                return clampDuration(parsed.getAsInt());
            }
        }
        return 20;
    }

    private List<String> resolveIngredients(List<String> hints) {
        if (CollectionUtils.isEmpty(hints)) {
            return List.of();
        }
        Set<String> detected = new LinkedHashSet<>();
        for (String hint : hints) {
            if (!StringUtils.hasText(hint)) {
                continue;
            }
            String normalized = hint.toLowerCase(Locale.ROOT);
            INGREDIENT_ALIASES.forEach((alias, canonical) -> {
                if (normalized.equals(alias) || normalized.contains(alias)) {
                    detected.add(canonical);
                }
            });
            for (String token : normalized.split("[^a-z]+")) {
                if (!token.isBlank()) {
                    String canonical = INGREDIENT_ALIASES.get(token);
                    if (canonical != null) {
                        detected.add(canonical);
                    }
                }
            }
        }
        return detected.isEmpty() ? List.of() : new ArrayList<>(detected);
    }

    private int resolveRecipeMaxTime(List<String> hints) {
        for (String hint : hints) {
            OptionalInt parsed = parseDuration(hint);
            if (parsed.isPresent()) {
                return clampDuration(parsed.getAsInt());
            }
        }
        return 30;
    }

    private OptionalInt parseDuration(String hint) {
        Matcher matcher = DURATION_PATTERN.matcher(hint);
        if (matcher.find()) {
            try {
                int minutes = Integer.parseInt(matcher.group(1));
                return OptionalInt.of(minutes);
            } catch (NumberFormatException ex) {
                return OptionalInt.empty();
            }
        }
        return OptionalInt.empty();
    }

    private int clampDuration(int minutes) {
        if (minutes < 10) {
            return 10;
        }
        if (minutes > 90) {
            return 90;
        }
        return minutes;
    }

    private JsonNode buildStoredHints(ImageRequest metadata,
                                      List<String> normalizedHints,
                                      String equipment,
                                      String level,
                                      int duration) {
        ObjectNode root = objectMapper.createObjectNode();
        if (metadata != null && StringUtils.hasText(metadata.getImageUrl())) {
            root.put("imageUrl", metadata.getImageUrl());
        }
        ArrayNode raw = objectMapper.createArrayNode();
        normalizedHints.forEach(raw::add);
        root.set("rawHints", raw);

        ObjectNode normalized = objectMapper.createObjectNode();
        normalized.put("equipment", equipment);
        normalized.put("level", level);
        normalized.put("targetDurationMinutes", duration);
        root.set("normalized", normalized);
        return root;
    }

    private JsonNode buildRecipeHints(ImageRequest metadata,
                                      List<String> normalizedHints,
                                      List<String> ingredients,
                                      int maxTime) {
        ObjectNode root = objectMapper.createObjectNode();
        if (metadata != null && StringUtils.hasText(metadata.getImageUrl())) {
            root.put("imageUrl", metadata.getImageUrl());
        }
        ArrayNode raw = objectMapper.createArrayNode();
        normalizedHints.forEach(raw::add);
        root.set("rawHints", raw);

        ObjectNode normalized = objectMapper.createObjectNode();
        ArrayNode ingredientsNode = objectMapper.createArrayNode();
        ingredients.forEach(ingredientsNode::add);
        normalized.set("ingredients", ingredientsNode);
        normalized.put("maxTimeMinutes", maxTime);
        root.set("normalized", normalized);
        return root;
    }

    @Value
    public static class WorkoutDetectionResult {
        String equipment;
        String level;
        int durationMinutes;
    }

    @Value
    public static class RecipeDetectionResult {
        List<String> ingredients;
        int maxTimeMinutes;
    }
}
