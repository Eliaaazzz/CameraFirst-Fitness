package com.fitnessapp.backend.workout.service;

import com.fitnessapp.backend.nutrition.repository.MealLogRepository;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository.MealLogLeaderboardRow;
import com.fitnessapp.backend.user.repository.UserRepository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LeaderboardService {

  public enum LeaderboardScope {
    DAILY,
    WEEKLY;

    public static LeaderboardScope from(String value) {
      if (value == null) {
        return WEEKLY;
      }
      return switch (value.toLowerCase(Locale.ROOT)) {
        case "daily", "day" -> DAILY;
        case "weekly", "week" -> WEEKLY;
        default -> throw new IllegalArgumentException("Unsupported scope: " + value);
      };
    }
  }

  private static final int CACHE_SIZE = 50;

  private final ObjectProvider<MealLogRepository> mealLogRepositoryProvider;
  private final ObjectProvider<UserRepository> userRepositoryProvider;

  public LeaderboardResult mealLogLeaderboard(String scopeValue, int limit) {
    LeaderboardScope scope = LeaderboardScope.from(scopeValue);
    int effectiveLimit = Math.max(1, Math.min(limit, CACHE_SIZE));

    MealLogRepository mealLogRepository = mealLogRepositoryProvider.getIfAvailable();
    UserRepository userRepository = userRepositoryProvider.getIfAvailable();
    if (mealLogRepository == null || userRepository == null) {
      return new LeaderboardResult(scope, OffsetDateTime.now(ZoneOffset.UTC), List.of());
    }

    OffsetDateTime windowStart = scope == LeaderboardScope.DAILY
        ? OffsetDateTime.now(ZoneOffset.UTC).minusDays(1)
        : OffsetDateTime.now(ZoneOffset.UTC).minusDays(7);

    List<LeaderboardEntry> topEntries = mealLogRepository
        .leaderboardSince(windowStart, PageRequest.of(0, CACHE_SIZE))
        .stream()
        .map(row -> toEntry(row, mealLogRepository, userRepository))
        .toList();
    List<LeaderboardEntry> ordered = assignPositions(topEntries);

    return new LeaderboardResult(scope, OffsetDateTime.now(ZoneOffset.UTC), ordered.stream().limit(effectiveLimit).toList());
  }

  private LeaderboardEntry toEntry(MealLogLeaderboardRow row,
                                   MealLogRepository mealLogRepository,
                                   UserRepository userRepository) {
    String displayName = userRepository.findById(row.getUserId())
        .map(user -> user.getEmail().split("@")[0])
        .orElse("User-" + row.getUserId().toString().substring(0, 8));

    int streak = computeStreak(row.getUserId(), mealLogRepository);
    return new LeaderboardEntry(
        0,
        row.getUserId(),
        displayName,
        streak,
        Math.toIntExact(row.getEntryCount()));
  }

  private int computeStreak(UUID userId, MealLogRepository mealLogRepository) {
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    OffsetDateTime horizon = now.minusDays(14);
    var logs = mealLogRepository.findByUserIdAndConsumedAtBetweenOrderByConsumedAtAsc(userId, horizon, now);
    if (logs.isEmpty()) {
      return 0;
    }
    var activeDays = logs.stream()
        .map(log -> log.getConsumedAt().atZoneSameInstant(ZoneOffset.UTC).toLocalDate())
        .collect(Collectors.toCollection(() -> new java.util.TreeSet<LocalDate>(Comparator.reverseOrder())));

    int streak = 0;
    LocalDate cursor = LocalDate.now(ZoneOffset.UTC);
    while (activeDays.contains(cursor)) {
      streak++;
      cursor = cursor.minusDays(1);
    }
    return streak;
  }

  private List<LeaderboardEntry> assignPositions(List<LeaderboardEntry> entries) {
    int[] counter = {0};
    return entries.stream()
        .filter(Objects::nonNull)
        .sorted(Comparator.comparingInt(LeaderboardEntry::score).reversed())
        .map(entry -> {
          counter[0] += 1;
          return new LeaderboardEntry(counter[0], entry.userId(), entry.displayName(), entry.streak(), entry.score());
        })
        .collect(Collectors.toList());
  }

  public record LeaderboardResult(LeaderboardScope scope,
                                  OffsetDateTime generatedAt,
                                  List<LeaderboardEntry> entries) {}

  public record LeaderboardEntry(int position,
                                 UUID userId,
                                 String displayName,
                                 int streak,
                                 int score) {}
}
