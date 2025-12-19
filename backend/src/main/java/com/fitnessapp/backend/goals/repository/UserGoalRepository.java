package com.fitnessapp.backend.goals.repository;

import com.fitnessapp.backend.goals.entity.UserGoal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserGoalRepository extends JpaRepository<UserGoal, UUID> {

    /**
     * Find the active goal for a user
     */
    @Query("SELECT g FROM UserGoal g WHERE g.user.id = :userId AND g.isActive = true")
    Optional<UserGoal> findActiveByUserId(@Param("userId") UUID userId);

    /**
     * Find all goals for a user (including inactive), ordered by most recent
     */
    @Query("SELECT g FROM UserGoal g WHERE g.user.id = :userId ORDER BY g.generatedAt DESC")
    List<UserGoal> findAllByUserId(@Param("userId") UUID userId);

    /**
     * Find goals by type (for analytics/recommendations)
     */
    @Query("SELECT g FROM UserGoal g WHERE g.goalType = :goalType AND g.isActive = true")
    List<UserGoal> findActiveByGoalType(@Param("goalType") String goalType);

    /**
     * Deactivate all existing goals for a user (before creating new one)
     */
    @Modifying
    @Query("UPDATE UserGoal g SET g.isActive = false, g.updatedAt = CURRENT_TIMESTAMP WHERE g.user.id = :userId AND g.isActive = true")
    void deactivateAllByUserId(@Param("userId") UUID userId);

    /**
     * Check if user has any active goal
     */
    @Query("SELECT COUNT(g) > 0 FROM UserGoal g WHERE g.user.id = :userId AND g.isActive = true")
    boolean hasActiveGoal(@Param("userId") UUID userId);

    /**
     * Delete all goals for a user (for account cleanup)
     */
    @Modifying
    @Query("DELETE FROM UserGoal g WHERE g.user.id = :userId")
    void deleteAllByUserId(@Param("userId") UUID userId);
}
