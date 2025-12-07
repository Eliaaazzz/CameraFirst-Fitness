package com.fitnessapp.backend.workout.controller;

import com.fitnessapp.backend.api.common.ApiEnvelope;
import com.fitnessapp.backend.workout.service.LeaderboardService;
import com.fitnessapp.backend.workout.service.LeaderboardService.LeaderboardEntry;
import com.fitnessapp.backend.workout.service.LeaderboardService.LeaderboardResult;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/gamification")
@RequiredArgsConstructor
@Validated
public class LeaderboardController {

  private final LeaderboardService leaderboardService;

  @GetMapping("/leaderboard/meal-logs")
  public ApiEnvelope<LeaderboardResponse> mealLogLeaderboard(
      @RequestParam(defaultValue = "weekly") String scope,
      @RequestParam(defaultValue = "10") @Min(1) @Max(50) int limit) {

    LeaderboardResult result = leaderboardService.mealLogLeaderboard(scope, limit);
    LeaderboardResponse response = new LeaderboardResponse(
        result.scope().name().toLowerCase(),
        result.generatedAt().toString(),
        result.entries().stream()
            .map(entry -> new LeaderboardEntryResponse(
                entry.position(),
                entry.userId().toString(),
                entry.displayName(),
                entry.score(),
                entry.streak()))
            .toList()
    );
    return ApiEnvelope.of(response);
  }

  public record LeaderboardResponse(
      @NotBlank String scope,
      @NotBlank String generatedAt,
      List<LeaderboardEntryResponse> entries
  ) {}

  public record LeaderboardEntryResponse(
      int position,
      String userId,
      String displayName,
      int score,
      int streak
  ) {}
}
