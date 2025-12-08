package com.fitnessapp.backend.workout.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 单次姿势分析结果 (视频中某个时间点的分析)
 */
@Entity
@Table(name = "pose_analysis_result")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PoseAnalysisResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * 关联的训练会话
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workout_session_id", nullable = false)
    private WorkoutSession workoutSession;

    /**
     * 分析的视频帧时间戳 (秒)
     */
    @Column(name = "timestamp_seconds", nullable = false)
    private Integer timestampSeconds;

    /**
     * 姿势评分 (1-10分)
     */
    @Column(name = "pose_score", nullable = false)
    private Integer poseScore;

    /**
     * GPT-4V 原始分析文本
     */
    @Column(name = "analysis_text", columnDefinition = "TEXT", nullable = false)
    private String analysisText;

    /**
     * 改进建议
     */
    @Column(name = "improvement_suggestions", columnDefinition = "TEXT")
    private String improvementSuggestions;

    /**
     * 检测到的问题 (JSON数组格式)
     * 例如: ["膝盖内扣15度", "背部弯曲", "深度不足"]
     */
    @Column(name = "detected_issues", columnDefinition = "TEXT")
    private String detectedIssues;

    /**
     * 关键关节角度数据 (JSON格式)
     * 例如: {"knee_angle_left": 85, "knee_angle_right": 90, "hip_angle": 110}
     */
    @Column(name = "joint_angles", columnDefinition = "TEXT")
    private String jointAngles;

    /**
     * 分析的视频帧截图URL
     */
    @Column(name = "frame_image_url", length = 500)
    private String frameImageUrl;

    /**
     * 分析状态
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "analysis_status", nullable = false)
    @Builder.Default
    private AnalysisStatus analysisStatus = AnalysisStatus.COMPLETED;

    /**
     * 错误信息 (如果分析失败)
     */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum AnalysisStatus {
        PENDING,        // 待分析
        PROCESSING,     // 分析中
        COMPLETED,      // 已完成
        FAILED          // 失败
    }
}
