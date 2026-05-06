package com.fitnessapp.backend.squad.service;

import com.fitnessapp.backend.squad.entity.Squad;
import com.fitnessapp.backend.squad.repository.SquadRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Hourly scheduler that evaluates each squad's shared streak shortly after the
 * squad's local midnight. Idempotent — re-running within the same local day is
 * a no-op (the service guards on {@code lastActiveDay}).
 *
 * <p>Why hourly instead of nightly? Squads have per-squad timezones, so the
 * "midnight" moment is different per squad. Iterating once per hour and only
 * acting when the local hour has rolled over to 0 lets us evaluate every squad
 * in its own zone without juggling per-zone cron triggers.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class SquadStreakScheduler {

  private final SquadRepository squadRepository;
  private final SquadService squadService;

  /** Fires at 5 minutes past every hour (UTC). */
  @Scheduled(cron = "${aurafitness.squads.streak-cron:0 5 * * * *}")
  public void evaluateAllSquads() {
    List<Squad> squads = squadRepository.findAll();
    if (squads.isEmpty()) return;

    int evaluated = 0;
    for (Squad squad : squads) {
      try {
        if (shouldEvaluateNow(squad)) {
          LocalDate yesterday = LocalDate.now(zoneOf(squad)).minusDays(1);
          squadService.evaluateStreakForDay(squad.getId(), yesterday);
          evaluated++;
        }
      } catch (Exception e) {
        log.error("Squad {} streak evaluation failed", squad.getId(), e);
      }
    }
    if (evaluated > 0) {
      log.info("Squad streak job evaluated {} of {} squads", evaluated, squads.size());
    }
  }

  private boolean shouldEvaluateNow(Squad squad) {
    ZoneId zone = zoneOf(squad);
    LocalTime localTime = LocalTime.now(zone);
    LocalDate localToday = LocalDate.now(zone);
    if (localTime.getHour() != 0) return false;
    return squad.getLastActiveDay() == null || squad.getLastActiveDay().isBefore(localToday);
  }

  private static ZoneId zoneOf(Squad squad) {
    String tz = squad.getTimezone();
    if (tz == null || tz.isBlank()) return ZoneId.of("UTC");
    try {
      return ZoneId.of(tz);
    } catch (Exception e) {
      return ZoneId.of("UTC");
    }
  }
}
