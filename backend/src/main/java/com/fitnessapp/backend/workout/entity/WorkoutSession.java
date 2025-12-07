package com.fitnessapp.backend.workout.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * 用户训练会话，记录每次训练的完整数据
 */
@Entity
@Table(name = "workout_session")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkoutSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * 关联用户 (目前简化处理，后续可以关联User表)
     */
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /**
     * 训练类型 (深蹲/卧推/硬拉/瑜伽等)
     */
    @Column(name = "exercise_type", nullable = false, length = 50)
    private String exerciseType;

    /**
     * 视频存储路径 (S3/本地路径)
     */
    @Column(name = "video_url", length = 500)
    private String videoUrl;

    /**
     * 视频时长 (秒)
     */
    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    /**
     * 训练开始时间
     */
    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    /**
     * 训练结束时间
     */
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    /**
     * 整体姿势评分 (1-10分)
     */
    @Column(name = "overall_pose_score")
    private Integer overallPoseScore;

    /**
     * 受伤风险标记 (JSON数组: ["膝盖内扣", "腰部过度伸展"])
     */
    @Column(name = "injury_risk_flags", columnDefinition = "TEXT")
    private String injuryRiskFlags;

    /**
     * 进步速率 (相比上次训练的改善百分比)
     */
    @Column(name = "improvement_rate")
    private Double improvementRate;

    /**
     * 会话状态
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private SessionStatus status = SessionStatus.ANALYZING;

    /**
     * AI分析结果 (多次分析，对应视频的不同时间点)
     */
    @OneToMany(mappedBy = "workoutSession", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PoseAnalysisResult> analysisResults = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (startedAt == null) {
            startedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * 添加分析结果
     */
    public void addAnalysisResult(PoseAnalysisResult result) {
        analysisResults.add(result);
        result.setWorkoutSession(this);
    }

    /**
     * 计算整体评分 (基于所有分析结果的平均值)
     */
    public void calculateOverallScore() {
        if (analysisResults.isEmpty()) {
            this.overallPoseScore = 0;
            return;
        }
        double avg = analysisResults.stream()
            .mapToInt(PoseAnalysisResult::getPoseScore)
            .average()
            .orElse(0.0);
        this.overallPoseScore = (int) Math.round(avg);
    }

    public enum SessionStatus {
        ANALYZING,      // 分析中
        COMPLETED,      // 已完成
        FAILED,         // 分析失败
        CANCELLED       // 用户取消
    }
}
