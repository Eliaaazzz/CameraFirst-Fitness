package com.fitnessapp.backend.importer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.domain.Ingredient;
import com.fitnessapp.backend.domain.Recipe;
import com.fitnessapp.backend.domain.RecipeIngredient;
import com.fitnessapp.backend.domain.RecipeIngredientId;
import com.fitnessapp.backend.repository.IngredientRepository;
import com.fitnessapp.backend.repository.RecipeRepository;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecipeImportService {

  private final RecipeRepository recipeRepo;
  private final IngredientRepository ingredientRepo;
  private final ObjectMapper objectMapper;
  private final RestTemplate restTemplate = new RestTemplate();

  @Value("${app.spoonacular.api-key:}")
  private String spoonacularApiKey;

  @Transactional
  public int importRecipesFromCsv(String filePath) {
    AtomicInteger counter = new AtomicInteger(0);
    try {
      List<String> lines = Files.readAllLines(Path.of(filePath));
      if (lines.isEmpty()) return 0;
      List<String> rows = lines.subList(1, lines.size());
      int total = rows.size();
      for (int i = 0; i < total; i++) {
        String row = rows.get(i);
        List<String> cols = Arrays.stream(row.split(",")).map(String::trim).collect(Collectors.toList());
        if (cols.size() < 9) {
          log.warn("Skipping malformed row {}: {}", i + 1, row);
          continue;
        }
        // CSV columns: API Source,Recipe ID,Title,Image URL,Time (minutes),Difficulty,Diet Tilt[],Calories,Protein (g),Top 3 Ingredients,...
        String apiSource = cols.get(0);
        String recipeId = cols.get(1);
        String title = cols.get(2);
        String imageUrl = cols.get(3);
        int timeMinutes = parseInt(cols.get(4), 0);
        String difficulty = cols.get(5);
        String top3 = cols.size() > 9 ? cols.get(9) : "";
        List<String> topIngredients = Arrays.stream(top3.split("[|,]"))
            .map(String::trim).filter(s -> !s.isBlank()).toList();

        Map<String, JsonNode> details = fetchRecipeDetails(apiSource, recipeId);
        JsonNode steps = details.getOrDefault("steps", objectMapper.createArrayNode());
        JsonNode swaps = details.getOrDefault("swaps", objectMapper.createArrayNode());
        JsonNode nutrition = details.get("nutrition");

        // Build recipe with all ingredients BEFORE saving
        Recipe r = Recipe.builder()
            .title(title)
            .imageUrl(imageUrl)
            .timeMinutes(timeMinutes)
            .difficulty(difficulty)
            .steps(steps)
            .swaps(swaps)
            .nutritionSummary(nutrition)
            .build();

        // Attach ingredients to unsaved recipe
        for (String name : topIngredients) {
          Ingredient ing = ingredientRepo.findByName(name)
              .orElseGet(() -> ingredientRepo.save(Ingredient.builder().name(name).build()));
          RecipeIngredient ri = RecipeIngredient.builder()
              .recipe(r)
              .ingredient(ing)
              .quantity(null)
              .unit(null)
              .build();
          ri.setId(new RecipeIngredientId(null, ing.getId()));
          r.getIngredients().add(ri);
        }

        // Single save with cascade
        recipeRepo.save(r);
        int done = counter.incrementAndGet();
        if (done % 5 == 0 || done == total) {
          log.info("Imported {}/{} recipes", done, total);
        }
      }
      return counter.get();
    } catch (Exception e) {
      log.error("Failed to import recipes from {}", filePath, e);
      return counter.get();
    }
  }

  private Map<String, JsonNode> fetchRecipeDetails(String apiSource, String recipeId) {
    Map<String, JsonNode> map = new HashMap<>();
    try {
      if ("Spoonacular".equalsIgnoreCase(apiSource) && spoonacularApiKey != null && !spoonacularApiKey.isBlank()) {
        String url = "https://api.spoonacular.com/recipes/" + recipeId + "/information?includeNutrition=true&apiKey=" + spoonacularApiKey;
        ResponseEntity<String> resp = restTemplate.getForEntity(url, String.class);
        if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
          // Store raw JSON in fields; a proper parser can be added later
          map.put("steps", extractStepsFromSpoonacular(resp.getBody()));
          map.put("swaps", objectMapper.createArrayNode());
          map.put("nutrition", extractNutritionFromSpoonacular(resp.getBody()));
        }
      }
    } catch (Exception e) {
      log.warn("Spoonacular fetch failed for {}: {}", recipeId, e.getMessage());
    }
    map.putIfAbsent("steps", objectMapper.createArrayNode());
    map.putIfAbsent("swaps", objectMapper.createArrayNode());
    return map;
  }

  private JsonNode extractStepsFromSpoonacular(String json) {
    // light placeholder: keep raw minimal array, real parsing deferred
    return objectMapper.createArrayNode();
  }

  private JsonNode extractNutritionFromSpoonacular(String json) {
    return null;
  }

  private static int parseInt(String s, int def) {
    try { return Integer.parseInt(s.trim()); } catch (Exception e) { return def; }
  }
}
