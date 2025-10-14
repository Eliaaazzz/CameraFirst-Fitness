package com.fitnessapp.backend.importer;

import com.fitnessapp.backend.domain.WorkoutVideo;
import com.fitnessapp.backend.repository.WorkoutVideoRepository;
import com.fitnessapp.backend.youtube.YouTubeService;
import com.fitnessapp.backend.youtube.dto.VideoMetadata;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class DataImportService {

  private final WorkoutVideoRepository workoutRepo;
  private final YouTubeService youTubeService;

  public int importWorkoutsFromCsv(String filePath) {
    AtomicInteger counter = new AtomicInteger(0);
    try {
      List<String> lines = Files.readAllLines(Path.of(filePath));
      if (lines.isEmpty()) return 0;
      // skip header
      List<String> rows = lines.subList(1, lines.size());
      int total = rows.size();
      for (int i = 0; i < total; i++) {
        String row = rows.get(i);
        List<String> cols = safeSplit(row);
        if (cols.size() < 8) {
          log.warn("Skipping malformed row {}: {}", i + 1, row);
          continue;
        }
        String url = cols.get(0);
        String videoId = cols.get(1);
        String title = cols.get(2);
        String channel = cols.get(3);
        int duration = parseInt(cols.get(4), 0);
        List<String> equipment = splitList(cols.get(5));
        String level = cols.get(6);
        List<String> bodyPart = splitList(cols.get(7));

        Optional<VideoMetadata> metadata = youTubeService.fetchVideoMetadata(videoId);
        if (metadata.isEmpty()) {
          log.warn("[{} / {}] Skipping {} (no metadata)", i + 1, total, videoId);
          continue;
        }
        VideoMetadata m = metadata.get();
        WorkoutVideo w = WorkoutVideo.builder()
            .youtubeId(videoId)
            .title(title != null && !title.isBlank() ? title : m.getTitle())
            .durationMinutes(duration > 0 ? duration : m.getDurationMinutes())
            .level(level)
            .equipment(equipment)
            .bodyPart(bodyPart)
            .thumbnailUrl(m.getThumbnailUrl())
            .viewCount(m.getViewCount())
            .build();
        workoutRepo.save(w);
        int done = counter.incrementAndGet();
        if (done % 5 == 0 || done == total) {
          log.info("Imported {}/{} workouts", done, total);
        }
      }
      return counter.get();
    } catch (Exception e) {
      log.error("Failed to import workouts from {}", filePath, e);
      return counter.get();
    }
  }

  private static int parseInt(String s, int def) {
    try { return Integer.parseInt(s.trim()); } catch (Exception e) { return def; }
  }

  private static List<String> splitList(String s) {
    if (s == null || s.isBlank()) return new ArrayList<>();
    String cleaned = s.replace("[", "").replace("]", "").trim();
    if (cleaned.isBlank()) return new ArrayList<>();
    return Arrays.stream(cleaned.split("[|,]"))
        .map(String::trim)
        .filter(v -> !v.isBlank())
        .collect(Collectors.toList());
  }

  private static List<String> safeSplit(String row) {
    // Very simple CSV split; assumes no quoted commas in this template
    return Arrays.stream(row.split(","))
        .map(String::trim)
        .collect(Collectors.toList());
  }
}

