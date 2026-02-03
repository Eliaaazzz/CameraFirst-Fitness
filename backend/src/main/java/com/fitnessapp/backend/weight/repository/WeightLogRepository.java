package com.fitnessapp.backend.weight.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.fitnessapp.backend.weight.entity.WeightLog;

@Repository
public interface WeightLogRepository extends JpaRepository<WeightLog, Long> {

    /**
     * Find a weight log for a specific user and date.
     */
    Optional<WeightLog> findByUserIdAndLogDate(UUID userId, LocalDate logDate);

    /**
     * Get weight history for a user within a date range, ordered by date descending.
     */
    @Query("""
        SELECT w FROM WeightLog w
        WHERE w.userId = :userId
          AND w.logDate BETWEEN :startDate AND :endDate
        ORDER BY w.logDate DESC
        """)
    List<WeightLog> findByUserIdAndDateRange(
        @Param("userId") UUID userId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );

    /**
     * Get the most recent weight log for a user.
     */
    Optional<WeightLog> findFirstByUserIdOrderByLogDateDesc(UUID userId);

    /**
     * Get the last N weight logs for a user, ordered by date descending.
     */
    @Query("""
        SELECT w FROM WeightLog w
        WHERE w.userId = :userId
        ORDER BY w.logDate DESC
        LIMIT :limit
        """)
    List<WeightLog> findRecentByUserId(
        @Param("userId") UUID userId,
        @Param("limit") int limit
    );

    /**
     * Count total weight logs for a user.
     */
    long countByUserId(UUID userId);

    /**
     * Delete all weight logs for a user (used for account deletion).
     */
    void deleteAllByUserId(UUID userId);
}
