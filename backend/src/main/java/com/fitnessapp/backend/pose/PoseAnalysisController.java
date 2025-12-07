package com.fitnessapp.backend.pose;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.workout.entity.PoseAnalysisResult;
import com.fitnessapp.backend.workout.entity.WorkoutSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * 姿势分析 API Controller
 */
@RestController
@RequestMapping("/api/v1/pose")
@RequiredArgsConstructor
@Slf4j
public class PoseAnalysisController {

    private final PoseAnalysisService poseAnalysisService;
    private final ObjectMapper objectMapper;

    /**
     * 分析训练姿势
     * 
     * POST /api/v1/pose/analyze
     * 
     * @param file 训练视频或图片
     * @param requestJson 请求参数 JSON
     * @return 分析结果
     */
    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PoseAnalysisResponse> analyzePose(
        @RequestPart("file") MultipartFile file,
        @RequestPart("data") String requestJson
    ) {
        try {
            log.info("Received pose analysis request, file: {}, size: {} bytes", 
                file.getOriginalFilename(), file.getSize());

            // 解析请求参数
            PoseAnalysisRequest request = objectMapper.readValue(requestJson, PoseAnalysisRequest.class);

            // 验证文件
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            // 验证文件类型
            String contentType = file.getContentType();
            if (contentType == null || 
                (!contentType.startsWith("image/") && !contentType.startsWith("video/"))) {
                log.warn("Invalid file type: {}", contentType);
                return ResponseEntity.badRequest().build();
            }

            // 调用分析服务
            UUID sessionId = poseAnalysisService.analyzeWorkout(
                request.userId(),
                request.exerciseType(),
                file
            );

            // 获取分析结果
            WorkoutSession session = poseAnalysisService.getUserWorkoutHistory(request.userId(), null)
                .stream()
                .filter(s -> s.getId().equals(sessionId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Session not found"));

            PoseAnalysisResponse response = buildResponse(session);

            log.info("Analysis completed successfully for session: {}", sessionId);
            return ResponseEntity.ok(response);

        } catch (IOException e) {
            log.error("Failed to parse request", e);
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Analysis failed", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * 获取用户的训练历史
     * 
     * GET /api/v1/pose/history/{userId}?exerciseType=squat
     */
    @GetMapping("/history/{userId}")
    public ResponseEntity<List<PoseAnalysisResponse>> getWorkoutHistory(
        @PathVariable UUID userId,
        @RequestParam(required = false) String exerciseType
    ) {
        try {
            List<WorkoutSession> sessions = poseAnalysisService.getUserWorkoutHistory(userId, exerciseType);
            List<PoseAnalysisResponse> responses = sessions.stream()
                .map(this::buildResponse)
                .toList();

            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            log.error("Failed to get workout history for user: {}", userId, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * 获取用户的进步统计
     * 
     * GET /api/v1/pose/progress/{userId}
     */
    @GetMapping("/progress/{userId}")
    public ResponseEntity<ProgressResponse> getUserProgress(@PathVariable UUID userId) {
        try {
            var stats = poseAnalysisService.getUserProgressStats(userId);

            ProgressResponse response = new ProgressResponse(
                stats.totalSessions(),
                stats.averageScore(),
                stats.recentSessions().stream()
                    .map(s -> new ProgressResponse.SessionSummary(
                        s.getId(),
                        s.getExerciseType(),
                        s.getOverallPoseScore() != null ? s.getOverallPoseScore() : 0,
                        s.getStartedAt()
                    ))
                    .toList()
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to get progress for user: {}", userId, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * 获取特定会话的详细信息
     * 
     * GET /api/v1/pose/session/{sessionId}
     */
    @GetMapping("/session/{sessionId}")
    public ResponseEntity<PoseAnalysisResponse> getSessionDetails(@PathVariable UUID sessionId) {
        // TODO: 实现会话详情查询
        return ResponseEntity.notFound().build();
    }

    /**
     * 构建响应对象
     */
    private PoseAnalysisResponse buildResponse(WorkoutSession session) {
        List<PoseAnalysisResponse.AnalysisDetail> details = session.getAnalysisResults().stream()
            .map(result -> new PoseAnalysisResponse.AnalysisDetail(
                result.getPoseScore(),
                result.getAnalysisText(),
                result.getImprovementSuggestions(),
                parseJsonArray(result.getDetectedIssues()),
                result.getTimestampSeconds()
            ))
            .toList();

        return new PoseAnalysisResponse(
            session.getId(),
            session.getExerciseType(),
            session.getOverallPoseScore() != null ? session.getOverallPoseScore() : 0,
            session.getStatus().name(),
            session.getCompletedAt() != null ? session.getCompletedAt() : session.getStartedAt(),
            details
        );
    }

    private List<String> parseJsonArray(String json) {
        try {
            return objectMapper.readValue(json, 
                objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
        } catch (Exception e) {
            log.warn("Failed to parse JSON array: {}", json);
            return List.of();
        }
    }

    /**
     * 进步统计响应
     */
    public record ProgressResponse(
        long totalSessions,
        double averageScore,
        List<SessionSummary> recentSessions
    ) {
        public record SessionSummary(
            UUID sessionId,
            String exerciseType,
            int score,
            java.time.LocalDateTime date
        ) {}
    }
}
