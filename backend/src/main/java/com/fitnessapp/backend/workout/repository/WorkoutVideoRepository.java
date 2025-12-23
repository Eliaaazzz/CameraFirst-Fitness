package com.fitnessapp.backend.workout.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.fitnessapp.backend.workout.entity.WorkoutVideo;

public interface WorkoutVideoRepository extends JpaRepository<WorkoutVideo, UUID> {
  List<WorkoutVideo> findByLevelAndDurationMinutesLessThanEqual(String level, Integer maxDuration);

  // Postgres-specific: check if array contains the given equipment value
  @Query(value = "select * from workout_video w where :equipment = ANY(w.equipment)", nativeQuery = true)
  List<WorkoutVideo> findByEquipmentContaining(@Param("equipment") String equipment);

  Optional<WorkoutVideo> findByYoutubeId(String youtubeId);

  List<WorkoutVideo> findByLastValidatedAtAfter(OffsetDateTime timestamp);

  // Text search by title or body parts
  @Query(value = """
      SELECT * FROM workout_video w
      WHERE LOWER(w.title) LIKE LOWER(CONCAT('%', :query, '%'))
         OR EXISTS (SELECT 1 FROM unnest(w.body_part) AS bp WHERE LOWER(bp) LIKE LOWER(CONCAT('%', :query, '%')))
         OR EXISTS (SELECT 1 FROM unnest(w.equipment) AS eq WHERE LOWER(eq) LIKE LOWER(CONCAT('%', :query, '%')))
      ORDER BY w.view_count DESC NULLS LAST
      LIMIT :limit
      """, nativeQuery = true)
  List<WorkoutVideo> searchByText(@Param("query") String query, @Param("limit") int limit);

  /**
   * Find top workouts by target goal, ordered by view count (most popular)
   */
  @Query(value = """
      SELECT * FROM workout_video w
      WHERE :goal = ANY(w.target_goal)
      ORDER BY w.view_count DESC NULLS LAST
      LIMIT :limit
      """, nativeQuery = true)
  List<WorkoutVideo> findTopByTargetGoal(@Param("goal") String goal, @Param("limit") int limit);
}
