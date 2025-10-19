package com.fitnessapp.backend.repository;

import com.fitnessapp.backend.domain.WorkoutVideo;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WorkoutVideoRepository extends JpaRepository<WorkoutVideo, UUID> {
  List<WorkoutVideo> findByLevelAndDurationMinutesLessThanEqual(String level, Integer maxDuration);

  // Postgres-specific: check if array contains the given equipment value
  @Query(value = "select * from workout_video w where :equipment = ANY(w.equipment)", nativeQuery = true)
  List<WorkoutVideo> findByEquipmentContaining(@Param("equipment") String equipment);

  Optional<WorkoutVideo> findByYoutubeId(String youtubeId);

  List<WorkoutVideo> findByLastValidatedAtAfter(OffsetDateTime timestamp);
}
