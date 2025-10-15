package com.fitnessapp.backend.admin;

import com.fitnessapp.backend.importer.DataImportService;
import com.fitnessapp.backend.importer.RecipeImportService;
import com.fitnessapp.backend.recipe.RecipeCuratorService;
import com.fitnessapp.backend.recipe.dto.RecipeCurationResult;
import com.fitnessapp.backend.youtube.YouTubeCuratorService;
import com.fitnessapp.backend.youtube.dto.CuratedCoverageReport;
import com.fitnessapp.backend.youtube.dto.PlaylistImportRequest;
import com.fitnessapp.backend.youtube.dto.PlaylistImportResult;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/import")
@RequiredArgsConstructor
@Validated
public class ImportController {

  private final DataImportService dataImportService;
  private final RecipeImportService recipeImportService;
  private final YouTubeCuratorService youTubeCuratorService;
  private final RecipeCuratorService recipeCuratorService;

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

  @PostMapping("/playlist")
  public ResponseEntity<PlaylistImportResult> importPlaylist(@Valid @RequestBody PlaylistImportRequest request) {
    PlaylistImportResult result = youTubeCuratorService.importPlaylist(request);
    return ResponseEntity.ok(result);
  }

  @PostMapping("/playlist/curated")
  public ResponseEntity<Map<String, PlaylistImportResult>> importCuratedPlaylists() {
    Map<String, PlaylistImportResult> results = youTubeCuratorService.importCuratedPlaylists();
    return ResponseEntity.ok(results);
  }

  @PostMapping("/videos/curated")
  public ResponseEntity<Map<String, Object>> importCuratedVideos() {
    Map<String, Object> results = youTubeCuratorService.importCuratedVideos();
    return ResponseEntity.ok(results);
  }

  @GetMapping("/playlist/coverage")
  public ResponseEntity<CuratedCoverageReport> curatedCoverage(
      @RequestParam(value = "hoursBack", defaultValue = "24") int hoursBack) {
    CuratedCoverageReport report = youTubeCuratorService.evaluateCuratedCoverage(hoursBack);
    return ResponseEntity.ok(report);
  }

  @PostMapping("/recipes/curated")
  public ResponseEntity<RecipeCurationResult> curateRecipes() {
    RecipeCurationResult result = recipeCuratorService.curateTopRecipes();
    return ResponseEntity.ok(result);
  }
}
