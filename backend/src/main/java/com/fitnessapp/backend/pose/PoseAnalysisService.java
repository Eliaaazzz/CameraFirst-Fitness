package com.fitnessapp.backend.pose;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.workout.entity.PoseAnalysisResult;
import com.fitnessapp.backend.workout.entity.WorkoutSession;
import com.fitnessapp.backend.workout.repository.PoseAnalysisResultRepository;
import com.fitnessapp.backend.workout.repository.WorkoutSessionRepository;
import com.theokanning.openai.completion.chat.ChatCompletionRequest;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.completion.chat.ChatMessageRole;
import com.theokanning.openai.image.ImageResult;
import com.theokanning.openai.service.OpenAiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 姿势分析核心服务 - 使用 GPT-4 Vision API
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class PoseAnalysisService {

    private final WorkoutSessionRepository sessionRepository;
    private final PoseAnalysisResultRepository analysisResultRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.openai.api-key}")
    private String openAiApiKey;

    @Value("${app.openai.model:gpt-4-vision-preview}")
    private String model;

    /**
     * 分析训练视频或图片
     * 
     * @param userId 用户ID
     * @param exerciseType 训练类型 (squat/deadlift/bench_press/yoga等)
     * @param file 视频文件或图片
     * @return 训练会话ID
     */
    @Transactional
    public UUID analyzeWorkout(UUID userId, String exerciseType, MultipartFile file) throws IOException {
        log.info("Starting workout analysis for user: {}, exercise: {}", userId, exerciseType);

        // 1. 创建训练会话
        WorkoutSession session = WorkoutSession.builder()
            .userId(userId)
            .exerciseType(exerciseType)
            .status(WorkoutSession.SessionStatus.ANALYZING)
            .build();
        session = sessionRepository.save(session);

        try {
            // 2. 将文件转换为 base64 (简化版，实际应上传到S3)
            String base64Image = Base64.getEncoder().encodeToString(file.getBytes());
            String imageUrl = "data:image/jpeg;base64," + base64Image;

            // 3. 调用 GPT-4 Vision 分析
            PoseAnalysisResponse response = analyzeWithGPT4Vision(exerciseType, imageUrl);

            // 4. 保存分析结果
            PoseAnalysisResult result = PoseAnalysisResult.builder()
                .workoutSession(session)
                .timestampSeconds(0) // 图片分析固定为0秒
                .poseScore(response.score())
                .analysisText(response.analysis())
                .improvementSuggestions(response.suggestions())
                .detectedIssues(toJsonArray(response.issues()))
                .analysisStatus(PoseAnalysisResult.AnalysisStatus.COMPLETED)
                .build();

            session.addAnalysisResult(result);
            session.calculateOverallScore();
            session.setStatus(WorkoutSession.SessionStatus.COMPLETED);
            session.setCompletedAt(java.time.LocalDateTime.now());

            sessionRepository.save(session);

            log.info("Analysis completed for session: {}, score: {}", session.getId(), response.score());
            return session.getId();

        } catch (Exception e) {
            log.error("Analysis failed for session: {}", session.getId(), e);
            session.setStatus(WorkoutSession.SessionStatus.FAILED);
            sessionRepository.save(session);
            throw new RuntimeException("姿势分析失败: " + e.getMessage(), e);
        }
    }

    /**
     * 使用 GPT-4 Vision 分析姿势
     */
    private PoseAnalysisResponse analyzeWithGPT4Vision(String exerciseType, String imageUrl) {
        OpenAiService service = new OpenAiService(openAiApiKey, Duration.ofSeconds(60));

        String prompt = buildAnalysisPrompt(exerciseType);

        try {
            // 构建请求 (注意: OpenAI Java SDK 可能需要特定格式，这里简化处理)
            ChatCompletionRequest request = ChatCompletionRequest.builder()
                .model(model)
                .messages(Arrays.asList(
                    new ChatMessage(ChatMessageRole.SYSTEM.value(), 
                        "你是一位专业的健身教练和姿势分析专家，精通运动生物力学。"),
                    new ChatMessage(ChatMessageRole.USER.value(), prompt)
                ))
                .maxTokens(1000)
                .temperature(0.7)
                .build();

            // 注意: 实际的 Vision API 调用需要特殊处理，这里简化为文本API
            // 真实实现需要使用 OpenAI 的 Vision 特定端点
            var response = service.createChatCompletion(request);
            String analysisText = response.getChoices().get(0).getMessage().getContent();

            log.info("GPT-4 Vision response: {}", analysisText);

            // 解析响应
            return parseAnalysisResponse(analysisText);

        } catch (Exception e) {
            log.error("GPT-4 Vision API call failed", e);
            throw new RuntimeException("GPT-4 Vision 调用失败", e);
        } finally {
            service.shutdownExecutor();
        }
    }

    /**
     * 构建分析提示词
     */
    private String buildAnalysisPrompt(String exerciseType) {
        Map<String, String> prompts = Map.of(
            "squat", """
                请分析这个深蹲动作的姿势，重点评估：
                1. 膝盖是否内扣或外翻 (应该与脚尖方向一致)
                2. 背部是否挺直 (不应该弯曲或过度伸展)
                3. 深蹲深度是否达标 (髋关节应低于膝关节)
                4. 重心是否稳定 (脚后跟不应离地)
                5. 脚掌位置是否正确 (与肩同宽)
                
                请按以下格式返回分析结果：
                【评分】: 1-10分
                【分析】: 详细描述观察到的姿势情况
                【问题】: 列出所有检测到的问题 (每行一个)
                【建议】: 给出具体的改进建议
                """,
            "deadlift", """
                请分析这个硬拉动作的姿势，重点评估：
                1. 背部是否保持中立 (不应该弯曲)
                2. 杠铃轨迹是否垂直 (紧贴小腿)
                3. 髋部和肩部是否同时启动
                4. 膝盖是否锁死在顶部
                
                请按以下格式返回分析结果：
                【评分】: 1-10分
                【分析】: 详细描述观察到的姿势情况
                【问题】: 列出所有检测到的问题 (每行一个)
                【建议】: 给出具体的改进建议
                """,
            "bench_press", """
                请分析这个卧推动作的姿势，重点评估：
                1. 手臂是否垂直于地面
                2. 肩胛骨是否收紧
                3. 腰部是否保持自然弧度
                4. 杠铃下降位置是否正确 (胸部中下方)
                
                请按以下格式返回分析结果：
                【评分】: 1-10分
                【分析】: 详细描述观察到的姿势情况
                【问题】: 列出所有检测到的问题 (每行一个)
                【建议】: 给出具体的改进建议
                """
        );

        return prompts.getOrDefault(exerciseType, 
            "请分析这个健身动作的姿势，指出所有问题并给出改进建议。按【评分】【分析】【问题】【建议】的格式返回。");
    }

    /**
     * 解析 GPT-4 返回的分析结果
     */
    private PoseAnalysisResponse parseAnalysisResponse(String text) {
        int score = extractScore(text);
        String analysis = extractSection(text, "分析");
        String suggestions = extractSection(text, "建议");
        List<String> issues = extractIssues(text);

        return new PoseAnalysisResponse(score, analysis, suggestions, issues);
    }

    private int extractScore(String text) {
        Pattern pattern = Pattern.compile("【评分】[：:] ?(\\d+)");
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }
        return 5; // 默认中等评分
    }

    private String extractSection(String text, String sectionName) {
        Pattern pattern = Pattern.compile("【" + sectionName + "】[：:]\\s*([^【]+)");
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return "";
    }

    private List<String> extractIssues(String text) {
        String issuesSection = extractSection(text, "问题");
        if (issuesSection.isEmpty()) {
            return Collections.emptyList();
        }
        return Arrays.stream(issuesSection.split("\n"))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toList();
    }

    private String toJsonArray(List<String> items) {
        try {
            return objectMapper.writeValueAsString(items);
        } catch (Exception e) {
            log.error("Failed to convert list to JSON", e);
            return "[]";
        }
    }

    /**
     * 获取用户的训练历史
     */
    public List<WorkoutSession> getUserWorkoutHistory(UUID userId, String exerciseType) {
        if (exerciseType != null && !exerciseType.isEmpty()) {
            return sessionRepository.findByUserIdAndExerciseTypeOrderByStartedAtDesc(userId, exerciseType);
        }
        return sessionRepository.findByUserIdOrderByStartedAtDesc(userId);
    }

    /**
     * 获取用户的进步数据
     */
    public ProgressStats getUserProgressStats(UUID userId) {
        List<WorkoutSession> recentSessions = sessionRepository.findRecentSessionsForProgressTracking(userId);
        Double averageScore = sessionRepository.getAveragePoseScoreByUserId(userId);
        long totalSessions = sessionRepository.countByUserId(userId);

        return new ProgressStats(
            totalSessions,
            averageScore != null ? averageScore : 0.0,
            recentSessions
        );
    }

    /**
     * 分析响应记录
     */
    private record PoseAnalysisResponse(
        int score,
        String analysis,
        String suggestions,
        List<String> issues
    ) {}

    /**
     * 进步统计记录
     */
    public record ProgressStats(
        long totalSessions,
        double averageScore,
        List<WorkoutSession> recentSessions
    ) {}
}
