package com.fitnessapp.backend.youtube;

import com.fitnessapp.backend.api.common.ApiEnvelope;
import com.fitnessapp.backend.youtube.dto.PlaylistImportRequest;
import com.fitnessapp.backend.youtube.dto.PlaylistImportResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST endpoints for YouTube video ingestion into exercise_videos.
 *
 * <p>Only available when {@code app.youtube.ingestion-enabled=true}.
 * These endpoints allow importing videos from YouTube playlists with quality filtering.
 */
@RestController
@RequestMapping(path = "/api/v1/ingestion/youtube", produces = MediaType.APPLICATION_JSON_VALUE)
@ConditionalOnProperty(name = "app.youtube.ingestion-enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "YouTube Ingestion", description = "Import YouTube workout videos into exercise_videos table")
public class IngestionController {

    private final ExerciseVideoIngestionService ingestionService;

    @Operation(
            summary = "Check ingestion status",
            description = "Returns whether YouTube ingestion is enabled and ready"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Ingestion status retrieved",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            examples = @ExampleObject(
                                    value = """
                                            {
                                              "success": true,
                                              "code": 200,
                                              "message": "Success",
                                              "data": {
                                                "ingestionEnabled": true,
                                                "curatedPlaylistCount": 6
                                              }
                                            }
                                            """
                            )
                    )
            )
    })
    @GetMapping("/status")
    public ApiEnvelope<Map<String, Object>> getStatus() {
        log.info("GET /api/v1/ingestion/youtube/status");
        return ApiEnvelope.success(Map.of(
                "ingestionEnabled", ingestionService.isIngestionEnabled(),
                "curatedPlaylistCount", 6
        ));
    }

    @Operation(
            summary = "Import a single playlist",
            description = """
                    Import videos from a YouTube playlist into exercise_videos.

                    **Quality Filters Applied:**
                    - Duration: 60s - 300s (configurable)
                    - Minimum view count: 50k (configurable)
                    - Minimum channel subscribers: 100k (configurable)
                    - Title must contain workout-related keywords

                    **Example Request:**
                    ```json
                    {
                      "playlistId": "PLhu1QCKrfgPWlhRHrJW7n16dxcam-oYfE",
                      "alias": "MadFit_Core",
                      "equipment": "bodyweight",
                      "level": "beginner",
                      "bodyParts": ["core", "abs"],
                      "targetCount": 10
                    }
                    ```
                    """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Playlist import completed",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            examples = @ExampleObject(
                                    value = """
                                            {
                                              "success": true,
                                              "code": 200,
                                              "message": "Success",
                                              "data": {
                                                "playlistId": "PLhu1QCKrfgPWlhRHrJW7n16dxcam-oYfE",
                                                "playlistAlias": "MadFit_Core",
                                                "requestedCount": 10,
                                                "importedCount": 8,
                                                "updatedCount": 2,
                                                "rejectedCount": 3,
                                                "inspectedCount": 13,
                                                "reviewNotes": ["views_too_low:abc123", "duration_too_long:xyz789"]
                                              }
                                            }
                                            """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid request",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            examples = @ExampleObject(
                                    value = """
                                            {
                                              "success": false,
                                              "code": 5002,
                                              "message": "playlistId is required",
                                              "path": "/api/v1/ingestion/youtube/playlist"
                                            }
                                            """
                            )
                    )
            )
    })
    @PostMapping("/playlist")
    public ApiEnvelope<PlaylistImportResult> importPlaylist(
            @Valid @RequestBody PlaylistImportRequest request) {
        log.info("POST /api/v1/ingestion/youtube/playlist - playlistId: {}, alias: {}",
                request.playlistId(), request.alias());

        PlaylistImportResult result = ingestionService.importPlaylist(request);

        log.info("Playlist import complete - imported: {}, updated: {}, rejected: {}",
                result.getImportedCount(), result.getUpdatedCount(), result.getRejectedCount());

        return ApiEnvelope.success(result);
    }

    @Operation(
            summary = "Import all curated playlists",
            description = """
                    Import videos from all pre-configured curated playlists.

                    **Curated Playlists:**
                    - MadFit_QuickCore5min (core, abs)
                    - MadFit_StandingAbs5min (core, abs)
                    - MadFit_ArmsShoulders5min (upper_body)
                    - MadFit_CardioBursts5min (cardio, full_body)
                    - MadFit_LowerBody5min (lower_body)
                    - Blogilates_PilatesCore5min (core, abs)
                    """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Curated playlists import completed",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            examples = @ExampleObject(
                                    value = """
                                            {
                                              "success": true,
                                              "code": 200,
                                              "message": "Success",
                                              "data": {
                                                "MadFit_QuickCore5min": {
                                                  "playlistId": "PLhu1QCKrfgPWlhRHrJW7n16dxcam-oYfE",
                                                  "importedCount": 8,
                                                  "updatedCount": 2
                                                },
                                                "MadFit_CardioBursts5min": {
                                                  "playlistId": "PLhu1QCKrfgPUWL3FAVjy2Pzs5v9d_7cKJ",
                                                  "importedCount": 7,
                                                  "updatedCount": 3
                                                }
                                              }
                                            }
                                            """
                            )
                    )
            )
    })
    @PostMapping("/curated")
    public ApiEnvelope<Map<String, PlaylistImportResult>> importCuratedPlaylists() {
        log.info("POST /api/v1/ingestion/youtube/curated");

        Map<String, PlaylistImportResult> results = ingestionService.importCuratedPlaylists();

        int totalImported = results.values().stream()
                .mapToInt(PlaylistImportResult::getImportedCount).sum();
        int totalUpdated = results.values().stream()
                .mapToInt(PlaylistImportResult::getUpdatedCount).sum();

        log.info("Curated playlists import complete - totalImported: {}, totalUpdated: {}",
                totalImported, totalUpdated);

        return ApiEnvelope.success(results);
    }
}
