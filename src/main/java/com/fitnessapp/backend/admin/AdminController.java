package com.fitnessapp.backend.admin;

import com.fitnessapp.backend.domain.Recipe;
import com.fitnessapp.backend.domain.WorkoutVideo;
import com.fitnessapp.backend.repository.RecipeRepository;
import com.fitnessapp.backend.repository.WorkoutVideoRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
    return recipeRepo.findAll().stream().map(RecipeDto::from).collect(Collectors.toList());
  }

  public record WorkoutVideoDto(String youtubeId, String title, Integer durationMinutes, String level,
                                List<String> equipment, List<String> bodyPart) {
    static WorkoutVideoDto from(WorkoutVideo w) {
      return new WorkoutVideoDto(w.getYoutubeId(), w.getTitle(), w.getDurationMinutes(), w.getLevel(),
          w.getEquipment(), w.getBodyPart());
    }
  }

  public record RecipeDto(String id, String title, Integer timeMinutes, String difficulty) {
    static RecipeDto from(Recipe r) {
      return new RecipeDto(String.valueOf(r.getId()), r.getTitle(), r.getTimeMinutes(), r.getDifficulty());
    }
  }
}























