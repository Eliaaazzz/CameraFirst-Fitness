package com.fitnessapp.backend.behavior.service;

import com.fitnessapp.backend.behavior.entity.UserBehaviorDay;
import com.fitnessapp.backend.behavior.predicate.BehaviorPredicate;
import com.fitnessapp.backend.behavior.predicate.BehaviorPredicateRegistry;
import com.fitnessapp.backend.behavior.repository.UserBehaviorDayRepository;
import com.fitnessapp.backend.behavior.score.DailyScoreCalculator;
import com.fitnessapp.backend.nutrition.entity.MealLog;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Backfills {@link UserBehaviorDay} rows. For each (user, day) it loads the
 * meals consumed that day, evaluates every registered predicate, and stores
 * the day's daily score so the stats service has a paired dataset.
 *
 * <p>Days are bucketed by UTC for v1; per-user timezone bucketing is a
 * follow-up once a profile timezone is captured.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class BehaviorDeriver {

  static final int BACKFILL_WINDOW_DAYS = 90;

  private final MealLogRepository mealLogRepository;
  private final BehaviorPredicateRegistry registry;
  private final DailyScoreCalculator scoreCalculator;
  private final UserBehaviorDayRepository dayRepository;

  /**
   * Derive and persist behavior days for a user across the
   * {@link #BACKFILL_WINDOW_DAYS}-day window ending on {@code through}.
   */
  @Transactional
  public int backfill(UUID userId, LocalDate through) {
    LocalDate from = through.minusDays(BACKFILL_WINDOW_DAYS - 1L);
    deriveRange(userId, from, through);
    return BACKFILL_WINDOW_DAYS;
  }

  /** Derive all days in {@code [from, to]} inclusive. */
  @Transactional
  public void deriveRange(UUID userId, LocalDate from, LocalDate to) {
    OffsetDateTime windowStart = from.atStartOfDay().atOffset(ZoneOffset.UTC);
    OffsetDateTime windowEnd   = to.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

    List<MealLog> meals = mealLogRepository
        .findByUserIdAndConsumedAtBetweenOrderByConsumedAtAsc(userId, windowStart, windowEnd);

    Map<LocalDate, List<MealLog>> grouped = groupByLocalDate(meals);

    // Wipe + rewrite for the whole range. Cheap (≤90 rows × 8 predicates per user).
    dayRepository.deleteByUserIdAndDayBetween(userId, from, to);

    List<UserBehaviorDay> rows = new ArrayList<>();
    LocalDate cursor = from;
    while (!cursor.isAfter(to)) {
      List<MealLog> dayMeals = grouped.getOrDefault(cursor, List.of());
      Short score = (short) scoreCalculator.calculate(dayMeals);
      for (BehaviorPredicate p : registry.all()) {
        boolean observed = p.evaluate(dayMeals);
        rows.add(UserBehaviorDay.builder()
            .userId(userId)
            .day(cursor)
            .behaviorKey(p.key())
            .observed(observed)
            .dailyScore(score)
            .build());
      }
      cursor = cursor.plusDays(1);
    }

    dayRepository.saveAll(rows);
    log.info("Behavior deriver: user={} wrote {} rows ({} → {})",
        userId, rows.size(), from, to);
  }

  // -------- helpers --------------------------------------------------------

  private static Map<LocalDate, List<MealLog>> groupByLocalDate(List<MealLog> meals) {
    Map<LocalDate, List<MealLog>> out = new HashMap<>();
    for (MealLog m : meals) {
      if (m.getConsumedAt() == null) continue;
      LocalDate d = m.getConsumedAt().withOffsetSameInstant(ZoneOffset.UTC).toLocalDate();
      out.computeIfAbsent(d, k -> new ArrayList<>()).add(m);
    }
    return out;
  }
}
