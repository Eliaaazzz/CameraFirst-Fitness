package com.fitnessapp.backend.admin;

import com.fitnessapp.backend.importer.DataImportService;
import com.fitnessapp.backend.importer.RecipeImportService;
import com.fitnessapp.backend.recipe.service.RecipeCuratorService;
import com.fitnessapp.backend.recipe.dto.RecipeCurationResult;
import com.fitnessapp.backend.youtube.YouTubeCuratorService;
import com.fitnessapp.backend.youtube.dto.CuratedCoverageReport;
import com.fitnessapp.backend.youtube.dto.PlaylistImportRequest;
import com.fitnessapp.backend.youtube.dto.PlaylistImportResult;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/import")
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasRole('ADMIN')")
public class ImportController {

  private final DataImportService dataImportService;
  private final RecipeImportService recipeImportService;
  private final YouTubeCuratorService youTubeCuratorService;
  private final RecipeCuratorService recipeCuratorService;

  @PostMapping("/workouts")
  public ResponseEntity<?> importWorkouts(@RequestParam("file") MultipartFile file) {
    try {
      int count = dataImportService.importWorkoutsFromCsv(file.getInputStream());
      return ResponseEntity.ok().body("Imported " + count + " workouts");
    } catch (IOException e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Failed to read uploaded file", e);
    }
  }

  @PostMapping("/recipes")
  public ResponseEntity<?> importRecipes(@RequestParam("file") MultipartFile file) {
    try {
      int count = recipeImportService.importRecipesFromCsv(file.getInputStream());
      return ResponseEntity.ok().body("Imported " + count + " recipes");
    } catch (IOException e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Failed to read uploaded file", e);
    }
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
