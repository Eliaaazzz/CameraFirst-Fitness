package com.fitnessapp.backend.workout.repository;

import com.fitnessapp.backend.workout.entity.WorkoutSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, UUID> {

    /**
     * 查找用户的所有训练会话，按时间倒序
     */
    List<WorkoutSession> findByUserIdOrderByStartedAtDesc(UUID userId);

    /**
     * 查找用户特定训练类型的会话
     */
    List<WorkoutSession> findByUserIdAndExerciseTypeOrderByStartedAtDesc(UUID userId, String exerciseType);

    /**
     * 查找用户在指定时间范围内的会话
     */
    List<WorkoutSession> findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(
        UUID userId, 
        LocalDateTime startDate, 
        LocalDateTime endDate
    );

    /**
     * 统计用户总训练次数
     */
    long countByUserId(UUID userId);

    /**
     * 获取用户的平均姿势评分
     */
    @Query("SELECT AVG(ws.overallPoseScore) FROM WorkoutSession ws WHERE ws.userId = :userId AND ws.overallPoseScore IS NOT NULL")
    Double getAveragePoseScoreByUserId(UUID userId);

    /**
     * 获取用户最近的进步趋势 (最近10次训练)
     */
    @Query("SELECT ws FROM WorkoutSession ws WHERE ws.userId = :userId AND ws.status = 'COMPLETED' ORDER BY ws.startedAt DESC LIMIT 10")
    List<WorkoutSession> findRecentSessionsForProgressTracking(UUID userId);
}
