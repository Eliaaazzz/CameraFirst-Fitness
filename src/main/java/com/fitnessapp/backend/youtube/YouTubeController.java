package com.fitnessapp.backend.youtube;

import com.fitnessapp.backend.youtube.dto.DurationResponse;
import com.fitnessapp.backend.youtube.dto.VideoMetadata;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/yt")
@RequiredArgsConstructor
public class YouTubeController {

    private final YouTubeService youTubeService;

    @GetMapping("/metadata")
    public ResponseEntity<?> getMetadata(@RequestParam("videoId") String videoId) {
        Optional<VideoMetadata> result = youTubeService.fetchVideoMetadata(videoId);
        return result.<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Video not found or API unavailable")));
    }

    @GetMapping("/parseDuration")
    public DurationResponse parseDuration(@RequestParam("iso") String iso) {
        int minutes = youTubeService.parseDuration(iso);
        return new DurationResponse(iso, minutes);
    }
}

