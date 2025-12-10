package com.fitnessapp.backend.nutrition.repository;

import com.fitnessapp.backend.nutrition.entity.MealLog;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MealLogRepository extends JpaRepository<MealLog, Long> {

  List<MealLog> findByUserIdAndConsumedAtBetweenOrderByConsumedAtAsc(UUID userId, OffsetDateTime start, OffsetDateTime end);

  @Query("select coalesce(sum(coalesce(m.calories, 0) + coalesce(m.totalCalories, 0)), 0) from MealLog m where m.userId = :userId and m.consumedAt between :start and :end")
  Long sumCalories(@Param("userId") UUID userId, @Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);

  @Query("select coalesce(sum(coalesce(m.proteinGrams, 0) + coalesce(m.totalProtein, 0)), 0) from MealLog m where m.userId = :userId and m.consumedAt between :start and :end")
  BigDecimal sumProtein(@Param("userId") UUID userId, @Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);

  @Query("select coalesce(sum(coalesce(m.carbsGrams, 0) + coalesce(m.totalCarbs, 0)), 0) from MealLog m where m.userId = :userId and m.consumedAt between :start and :end")
  BigDecimal sumCarbs(@Param("userId") UUID userId, @Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);

  @Query("select coalesce(sum(coalesce(m.fatGrams, 0) + coalesce(m.totalFat, 0)), 0) from MealLog m where m.userId = :userId and m.consumedAt between :start and :end")
  BigDecimal sumFat(@Param("userId") UUID userId, @Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);

  @Query("""
      select m.userId as userId,
             count(m) as entryCount,
             max(m.consumedAt) as lastLog
        from MealLog m
       where m.consumedAt >= :start
       group by m.userId
       order by entryCount desc, lastLog desc
      """)
  List<MealLogLeaderboardRow> leaderboardSince(@Param("start") OffsetDateTime start, Pageable pageable);

  interface MealLogLeaderboardRow {
    UUID getUserId();
    long getEntryCount();
    OffsetDateTime getLastLog();
  }
}
