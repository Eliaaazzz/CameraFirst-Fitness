package com.fitnessapp.backend.admin;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitnessapp.backend.domain.Recipe;
import com.fitnessapp.backend.domain.WorkoutVideo;
import com.fitnessapp.backend.repository.RecipeRepository;
import com.fitnessapp.backend.repository.WorkoutVideoRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

  private final WorkoutVideoRepository workoutRepo;
  private final RecipeRepository recipeRepo;

  @GetMapping("/workouts")
  public List<WorkoutVideoDto> getAllWorkouts() {
    return workoutRepo.findAll().stream().map(WorkoutVideoDto::from).collect(Collectors.toList());
  }

  @GetMapping("/recipes")
  public List<RecipeDto> getAllRecipes() {
    return recipeRepo.findAllWithIngredients().stream().map(RecipeDto::from).collect(Collectors.toList());
  }

  @GetMapping("/recipes/{id}")
  public RecipeDto getRecipeById(@PathVariable String id) {
    return recipeRepo.findByIdWithIngredients(java.util.UUID.fromString(id))
        .map(RecipeDto::from)
        .orElseThrow(() -> new RuntimeException("Recipe not found: " + id));
  }

  public record WorkoutVideoDto(String youtubeId, String title, Integer durationMinutes, String level,
                                List<String> equipment, List<String> bodyPart) {
    static WorkoutVideoDto from(WorkoutVideo w) {
      return new WorkoutVideoDto(w.getYoutubeId(), w.getTitle(), w.getDurationMinutes(), w.getLevel(),
          w.getEquipment(), w.getBodyPart());
    }
  }

  public record RecipeDto(
      String id, 
      String title, 
      String imageUrl,
      Integer timeMinutes, 
      String difficulty,
      JsonNode nutritionSummary,
      JsonNode steps,
      List<IngredientDto> ingredients
  ) {
    static RecipeDto from(Recipe r) {
      // Generate placeholder image URL based on title keywords if no imageUrl
      String imgUrl = r.getImageUrl();
      if (imgUrl == null || imgUrl.isBlank()) {
        imgUrl = generatePlaceholderImage(r.getTitle());
      }
      
      List<IngredientDto> ingredientList = r.getIngredients() == null ? List.of() :
          r.getIngredients().stream()
              .map(ri -> new IngredientDto(
                  ri.getIngredient().getName(),
                  ri.getQuantity() != null ? ri.getQuantity().doubleValue() : null,
                  ri.getUnit()
              ))
              .collect(Collectors.toList());
      
      return new RecipeDto(
          String.valueOf(r.getId()), 
          r.getTitle(), 
          imgUrl,
          r.getTimeMinutes(), 
          r.getDifficulty(),
          r.getNutritionSummary(),
          r.getSteps(),
          ingredientList
      );
    }
    
    private static String generatePlaceholderImage(String title) {
      String lowerTitle = title.toLowerCase();
      if (lowerTitle.contains("chicken")) {
        return "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800";
      }
      if (lowerTitle.contains("salmon") || lowerTitle.contains("fish")) {
        return "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800";
      }
      if (lowerTitle.contains("beef") || lowerTitle.contains("steak")) {
        return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800";
      }
      if (lowerTitle.contains("pasta")) {
        return "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800";
      }
      if (lowerTitle.contains("salad") || lowerTitle.contains("veggie")) {
        return "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800";
      }
      if (lowerTitle.contains("egg") || lowerTitle.contains("omelette")) {
        return "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800";
      }
      if (lowerTitle.contains("tofu")) {
        return "https://images.unsplash.com/photo-1546069901-d5bfd2cbfb1f?w=800";
      }
      if (lowerTitle.contains("shrimp")) {
        return "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800";
      }
      if (lowerTitle.contains("soup") || lowerTitle.contains("lentil")) {
        return "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800";
      }
      // Default: hash-based selection for variety
      int hash = Math.abs(title.hashCode());
      String[] defaultImages = {
          "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800",
          "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
          "https://images.unsplash.com/photo-1547592180-85f173990554?w=800",
          "https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=800",
          "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800"
      };
      return defaultImages[hash % defaultImages.length];
    }
  }
  
  public record IngredientDto(String name, Double quantity, String unit) {}
}























