package com.fitnessapp.backend.workout.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.fitnessapp.backend.workout.entity.ExerciseVideo;

@Repository
public interface ExerciseVideoRepository extends JpaRepository<ExerciseVideo, UUID> {

    List<ExerciseVideo> findByPrimaryCategory(String category);

    List<ExerciseVideo> findByExerciseSlug(String slug);

    @Query(value = """
        SELECT * FROM exercise_videos e
        WHERE LOWER(e.exercise_name) LIKE LOWER(CONCAT('%', :query, '%'))
           OR LOWER(e.exercise_slug) LIKE LOWER(CONCAT('%', :query, '%'))
           OR LOWER(e.primary_category) LIKE LOWER(CONCAT('%', :query, '%'))
        ORDER BY e.exercise_name
        LIMIT :limit
        """, nativeQuery = true)
    List<ExerciseVideo> searchByKeyword(
            @Param("query") String query,
            @Param("limit") int limit);

    @Query(value = """
        SELECT * FROM exercise_videos e
        WHERE (:category IS NULL OR LOWER(e.primary_category) = LOWER(:category))
        ORDER BY e.exercise_name
        LIMIT :limit
        """, nativeQuery = true)
    List<ExerciseVideo> findByCategory(
            @Param("category") String category,
            @Param("limit") int limit);

    List<ExerciseVideo> findAllByOrderByExerciseNameAsc();
}
