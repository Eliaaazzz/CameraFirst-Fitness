package com.fitnessapp.backend.workout.repository;

import com.fitnessapp.backend.workout.entity.PoseAnalysisResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PoseAnalysisResultRepository extends JpaRepository<PoseAnalysisResult, UUID> {

    /**
     * 查找特定会话的所有分析结果，按时间戳排序
     */
    List<PoseAnalysisResult> findByWorkoutSessionIdOrderByTimestampSecondsAsc(UUID workoutSessionId);

    /**
     * 查找会话中评分最高的分析结果
     */
    PoseAnalysisResult findFirstByWorkoutSessionIdOrderByPoseScoreDesc(UUID workoutSessionId);

    /**
     * 查找会话中评分最低的分析结果
     */
    PoseAnalysisResult findFirstByWorkoutSessionIdOrderByPoseScoreAsc(UUID workoutSessionId);
}
