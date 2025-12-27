package com.fitnessapp.backend.admin;

import com.fitnessapp.backend.api.common.ApiEnvelope;
import com.fitnessapp.backend.importer.DataImportService;
import com.fitnessapp.backend.importer.RecipeImportService;
import com.fitnessapp.backend.recipe.service.RecipeCuratorService;
import com.fitnessapp.backend.recipe.dto.RecipeCurationResult;
import com.fitnessapp.backend.youtube.ExerciseVideoIngestionService;
import com.fitnessapp.backend.youtube.dto.PlaylistImportRequest;
import com.fitnessapp.backend.youtube.dto.PlaylistImportResult;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

/**
 * Admin endpoints for data import operations.
 *
 * <p>YouTube ingestion endpoints now use {@link ExerciseVideoIngestionService}
 * targeting exercise_videos table. Legacy workout_video ingestion is deprecated.
 */
@RestController
@RequestMapping("/api/admin/import")
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasAnyRole('ADMIN', 'API_CLIENT')")
@Slf4j
public class ImportController {

    private final DataImportService dataImportService;
    private final RecipeImportService recipeImportService;
    private final ExerciseVideoIngestionService exerciseVideoIngestionService;
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

    /**
     * Import a single YouTube playlist into exercise_videos.
     *
     * <p>Requires {@code app.youtube.ingestion-enabled=true}.
     */
    @PostMapping("/playlist")
    public ResponseEntity<ApiEnvelope<PlaylistImportResult>> importPlaylist(
            @Valid @RequestBody PlaylistImportRequest request) {
        log.info("POST /api/admin/import/playlist - playlistId: {}", request.playlistId());

        if (!exerciseVideoIngestionService.isIngestionEnabled()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ApiEnvelope.error(
                            com.fitnessapp.backend.api.common.ErrorCode.RECOMMENDATION_SERVICE_ERROR,
                            "YouTube ingestion is disabled. Set app.youtube.ingestion-enabled=true",
                            "/api/admin/import/playlist"));
        }

        PlaylistImportResult result = exerciseVideoIngestionService.importPlaylist(request);
        return ResponseEntity.ok(ApiEnvelope.success(result));
    }

    /**
     * Import all curated YouTube playlists into exercise_videos.
     *
     * <p>Requires {@code app.youtube.ingestion-enabled=true}.
     */
    @PostMapping("/playlist/curated")
    public ResponseEntity<ApiEnvelope<Map<String, PlaylistImportResult>>> importCuratedPlaylists() {
        log.info("POST /api/admin/import/playlist/curated");

        if (!exerciseVideoIngestionService.isIngestionEnabled()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ApiEnvelope.error(
                            com.fitnessapp.backend.api.common.ErrorCode.RECOMMENDATION_SERVICE_ERROR,
                            "YouTube ingestion is disabled. Set app.youtube.ingestion-enabled=true",
                            "/api/admin/import/playlist/curated"));
        }

        Map<String, PlaylistImportResult> results = exerciseVideoIngestionService.importCuratedPlaylists();
        return ResponseEntity.ok(ApiEnvelope.success(results));
    }

    /**
     * Legacy endpoint - now redirects to curated playlist import.
     *
     * @deprecated Use {@link #importCuratedPlaylists()} instead
     */
    @Deprecated
    @PostMapping("/videos/curated")
    public ResponseEntity<ApiEnvelope<Map<String, PlaylistImportResult>>> importCuratedVideos() {
        log.warn("POST /api/admin/import/videos/curated - deprecated, use /playlist/curated instead");
        return importCuratedPlaylists();
    }

    /**
     * Get ingestion status and coverage info.
     */
    @GetMapping("/playlist/coverage")
    public ResponseEntity<ApiEnvelope<Map<String, Object>>> curatedCoverage(
            @RequestParam(value = "hoursBack", defaultValue = "24") int hoursBack) {
        log.info("GET /api/admin/import/playlist/coverage - hoursBack: {}", hoursBack);

        // Return basic status instead of coverage report
        Map<String, Object> status = Map.of(
                "ingestionEnabled", exerciseVideoIngestionService.isIngestionEnabled(),
                "message", "Use /api/v1/ingestion/youtube/status for detailed ingestion info"
        );

        return ResponseEntity.ok(ApiEnvelope.success(status));
    }

    @PostMapping("/recipes/curated")
    public ResponseEntity<RecipeCurationResult> curateRecipes() {
        RecipeCurationResult result = recipeCuratorService.curateTopRecipes();
        return ResponseEntity.ok(result);
    }
}
