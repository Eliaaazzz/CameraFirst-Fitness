package com.fitnessapp.backend.admin;

import com.fitnessapp.backend.importer.DataImportService;
import com.fitnessapp.backend.importer.RecipeImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/import")
@RequiredArgsConstructor
public class ImportController {

  private final DataImportService dataImportService;
  private final RecipeImportService recipeImportService;

  @PostMapping("/workouts")
  public ResponseEntity<?> importWorkouts(@RequestParam("file") String filePath) {
    int count = dataImportService.importWorkoutsFromCsv(filePath);
    return ResponseEntity.ok().body("Imported " + count + " workouts");
  }

  @PostMapping("/recipes")
  public ResponseEntity<?> importRecipes(@RequestParam("file") String filePath) {
    int count = recipeImportService.importRecipesFromCsv(filePath);
    return ResponseEntity.ok().body("Imported " + count + " recipes");
  }
}

