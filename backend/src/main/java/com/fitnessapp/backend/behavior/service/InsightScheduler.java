package com.fitnessapp.backend.behavior.service;

import com.fitnessapp.backend.behavior.repository.UserBehaviorDayRepository;
import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.repository.UserRepository;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Nightly job that re-derives behavior days for the trailing day and recomputes
 * each user's insights. Scheduled at 03:00 UTC by default; override via the
 * {@code aurafitness.insights.recompute-cron} property.
 *
 * <p>For each user we incrementally derive *only* yesterday (cheap) so the
 * 90-day pool stays current without rewriting the full window every night.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class InsightScheduler {

  private final UserRepository userRepository;
  private final UserBehaviorDayRepository dayRepository;
  private final BehaviorDeriver deriver;
  private final InsightStatsService statsService;

  @Scheduled(cron = "${aurafitness.insights.recompute-cron:0 0 3 * * *}")
  public void runNightly() {
    LocalDate yesterday = LocalDate.now(ZoneOffset.UTC).minusDays(1);
    LocalDate trimAfter = yesterday.minusDays(90);

    List<User> users = userRepository.findAll();
    int derived = 0;
    int recomputed = 0;
    for (User user : users) {
      try {
        deriver.deriveRange(user.getId(), yesterday, yesterday);
        // Trim everything older than the 90-day window so the table doesn't grow unbounded.
        dayRepository.deleteByUserIdAndDayBetween(user.getId(), LocalDate.of(2000, 1, 1), trimAfter);
        derived++;
        statsService.recomputeForUser(user.getId());
        recomputed++;
      } catch (Exception e) {
        log.error("Insight nightly job failed for user {}", user.getId(), e);
      }
    }
    log.info("Insight nightly job: derived={} recomputed={} of {} users", derived, recomputed, users.size());
  }
}
