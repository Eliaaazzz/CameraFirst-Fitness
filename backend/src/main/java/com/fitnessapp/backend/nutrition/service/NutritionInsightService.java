package com.fitnessapp.backend.nutrition.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.config.OpenAiProperties;
import com.fitnessapp.backend.nutrition.entity.MealLog;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.openai.ChatCompletionClient;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.nutrition.service.NutritionTrackingService.NutritionSummary;
import com.fitnessapp.backend.service.cache.NutritionAdviceStore;
import com.fitnessapp.backend.service.cache.NutritionAdviceStore.AdviceEntry;
import jakarta.persistence.EntityNotFoundException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
public class NutritionInsightService {

  private final NutritionTrackingService trackingService;
  private final MealLogRepository mealLogRepository;
  private final UserProfileRepository userProfileRepository;
  private final Optional<ChatCompletionClient> chatCompletionClient;
  private final OpenAiProperties openAiProperties;
  private final ObjectMapper objectMapper;
  private final NutritionAdviceStore adviceStore;

  public NutritionInsightService(
      NutritionTrackingService trackingService,
      MealLogRepository mealLogRepository,
      UserProfileRepository userProfileRepository,
      Optional<ChatCompletionClient> chatCompletionClient,
      OpenAiProperties openAiProperties,
      ObjectMapper objectMapper,
      NutritionAdviceStore adviceStore) {
    this.trackingService = trackingService;
    this.mealLogRepository = mealLogRepository;
    this.userProfileRepository = userProfileRepository;
    this.chatCompletionClient = chatCompletionClient;
    this.openAiProperties = openAiProperties;
    this.objectMapper = objectMapper;
    this.adviceStore = adviceStore;
  }

  @Transactional(readOnly = true)
  public NutritionInsight generateWeeklyInsight(UUID userId, LocalDate weekStart) {
    LocalDate start = normaliseWeekStart(weekStart);
    NutritionSummary summary = trackingService.weeklySummary(userId, start);

    OffsetDateTime rangeStart = summary.rangeStart();
    OffsetDateTime rangeEnd = summary.rangeEnd();

    List<MealLog> logs = mealLogRepository.findByUserIdAndConsumedAtBetweenOrderByConsumedAtAsc(
        userId, rangeStart, rangeEnd);

    SummarySignature signature = signatureFor(summary);
    String signatureKey = signature.key();

    AdviceEntry cachedAdvice = adviceStore.get(userId, start);
    String aiAdvice;
    if (cachedAdvice != null && Objects.equals(cachedAdvice.signature(), signatureKey)) {
      aiAdvice = cachedAdvice.advice();
      adviceStore.refresh(userId, start, cachedAdvice);
    } else {
      // Try to get profile, fall back to a minimal default if not found
      // Note: trackingService.weeklySummary() will auto-create profile if needed
      UserProfile profile = userProfileRepository.findByUserId(userId)
          .orElseGet(() -> createMinimalProfileForAdvice(userId));
      aiAdvice = buildAiAdvice(profile, summary, logs);
      AdviceEntry entry = new AdviceEntry(signatureKey, aiAdvice);
      adviceStore.put(userId, start, entry);
    }

    return new NutritionInsight(summary, logs, aiAdvice);
  }

  private String buildAiAdvice(UserProfile profile, NutritionSummary summary, List<MealLog> logs) {
    // Check if OpenAI is available
    if (chatCompletionClient.isEmpty()) {
      log.warn("OpenAI is not enabled. Returning fallback nutrition advice.");
      return buildFallbackAdvice(summary);
    }

    try {
      String profileSection = buildProfileSection(profile, summary);
      String nutritionSection = buildNutritionSection(summary);
      String logsSection = buildLogsSection(logs);

      String prompt = """
          你是一位资深营养师，请阅读以下信息，并用三个小节输出洞察：
          1) 做得好的地方
          2) 需要关注的风险
          3) 三条可执行的改进建议（每条建议以 "•" 开头）

          要求：专业但友好，控制在250字以内，使用简体中文。

          用户画像:
          %s

          营养摄入总结:
          %s

          最近进食记录:
          %s
          """.formatted(profileSection, nutritionSection, logsSection);

      return chatCompletionClient.get().complete(openAiProperties.getModel(), List.of(
          new com.theokanning.openai.completion.chat.ChatMessage(
              com.theokanning.openai.completion.chat.ChatMessageRole.SYSTEM.value(),
              "你是一位专业的营养师和健康教练，擅长为健身用户提供科学饮食建议"),
          new com.theokanning.openai.completion.chat.ChatMessage(
              com.theokanning.openai.completion.chat.ChatMessageRole.USER.value(), prompt)
      ), 450, 0.3);
    } catch (Exception e) {
      log.warn("Failed to build nutrition insight prompt", e);
      return buildFallbackAdvice(summary);
    }
  }

  private String buildFallbackAdvice(NutritionSummary summary) {
    StringBuilder advice = new StringBuilder();

    advice.append("营养摄入分析：\n\n");

    // 分析做得好的地方
    advice.append("✓ 积极的方面：\n");
    if (summary.calories().percent() >= 90 && summary.calories().percent() <= 110) {
      advice.append("• 卡路里摄入控制良好\n");
    }
    if (summary.protein().percent() >= 90) {
      advice.append("• 蛋白质摄入充足\n");
    }
    if (advice.length() == advice.indexOf("✓ 积极的方面：\n") + "✓ 积极的方面：\n".length()) {
      advice.append("• 保持记录饮食的好习惯\n");
    }

    advice.append("\n⚠ 需要关注：\n");
    if (!summary.alerts().isEmpty()) {
      for (String alert : summary.alerts()) {
        advice.append("• ").append(alert).append("\n");
      }
    } else {
      advice.append("• 目前营养摄入基本均衡\n");
    }

    advice.append("\n→ 改进建议：\n");
    if (summary.protein().percent() < 80) {
      advice.append("• 增加优质蛋白摄入（鸡胸肉、鱼类、豆制品）\n");
    }
    if (summary.calories().percent() > 110) {
      advice.append("• 适当控制总热量，增加蔬菜比例\n");
    }
    if (summary.carbs().percent() > 110) {
      advice.append("• 选择复杂碳水化合物（全麦、糙米、燕麦）\n");
    }
    if (advice.length() == advice.lastIndexOf("\n→ 改进建议：\n") + "\n→ 改进建议：\n".length()) {
      advice.append("• 保持均衡饮食，定时定量进餐\n");
      advice.append("• 多喝水，每天至少8杯\n");
      advice.append("• 适当增加蔬菜水果摄入\n");
    }

    return advice.toString();
  }

  private String buildProfileSection(UserProfile profile, NutritionSummary summary) {
    String goal = profile.getFitnessGoal() != null ? humanize(profile.getFitnessGoal()) : "未设置";
    String preference = profile.getDietaryPreference() != null ? humanize(profile.getDietaryPreference()) : "无特殊偏好";
    java.util.Set<com.fitnessapp.backend.user.entity.Allergen> allergensSet =
        profile.getAllergens() != null ? profile.getAllergens() : java.util.Collections.emptySet();
    String allergens = allergensSet.isEmpty()
        ? "无过敏史"
        : allergensSet.stream().map(this::humanize).reduce((a, b) -> a + "、" + b).orElse("无过敏史");

    String body = """
        - 目标：%s
        - 饮食偏好：%s
        - 过敏原：%s
        """.formatted(goal, preference, allergens);

    if (profile.getHeightCm() != null || profile.getWeightKg() != null) {
      body += "- 体型："
          + (profile.getHeightCm() != null ? profile.getHeightCm() + "cm" : "未知身高")
          + " / "
          + (profile.getWeightKg() != null ? profile.getWeightKg() + "kg" : "未知体重")
          + "\n";
    }

    body += "- 分析区间：%d 天".formatted(summary.days());
    return body;
  }

  private String buildNutritionSection(NutritionSummary summary) {
    String alerts = summary.alerts().isEmpty()
        ? "暂无异常提醒"
        : String.join("\n- ", summary.alerts());

    return """
        - 卡路里：%.0f / %.0f (%.0f%%)
        - 蛋白质：%.0f / %.0f (%.0f%%)
        - 碳水：%.0f / %.0f (%.0f%%)
        - 脂肪：%.0f / %.0f (%.0f%%)
        - 关键提醒：
        - %s
        """.formatted(
        summary.calories().actual(), summary.calories().target(), summary.calories().percent(),
        summary.protein().actual(), summary.protein().target(), summary.protein().percent(),
        summary.carbs().actual(), summary.carbs().target(), summary.carbs().percent(),
        summary.fat().actual(), summary.fat().target(), summary.fat().percent(),
        alerts);
  }

  private String buildLogsSection(List<MealLog> logs) throws JsonProcessingException {
    if (logs.isEmpty()) {
      return "无记录";
    }

    List<Map<String, Object>> summarised = logs.stream()
        .limit(12)
        .map(log -> Map.<String, Object>of(
            "date", log.getConsumedAt() != null ? log.getConsumedAt().toLocalDate().toString() : "未知日期",
            "time", log.getConsumedAt() != null ? log.getConsumedAt().toLocalTime().withNano(0).toString() : "--:--",
            "mealType", log.getMealType(),
            "recipe", log.getRecipeName(),
            "calories", log.getCalories(),
            "protein", log.getProteinGrams(),
            "carbs", log.getCarbsGrams(),
            "fat", log.getFatGrams()
        ))
        .toList();

    return objectMapper.writeValueAsString(summarised);
  }

  private String humanize(Enum<?> value) {
    String lower = value.name().toLowerCase(java.util.Locale.ROOT).replace('_', ' ');
    return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
  }

  public void invalidate(UUID userId) {
    adviceStore.invalidate(userId);
  }

  public void invalidate(UUID userId, LocalDate weekStart) {
    adviceStore.invalidate(userId, normaliseWeekStart(weekStart));
  }

  public void invalidateIfChanged(UUID userId, LocalDate referenceDate) {
    LocalDate start = normaliseWeekStart(referenceDate);
    AdviceEntry cached = adviceStore.get(userId, start);
    if (cached == null) {
      return;
    }

    NutritionSummary latestSummary = trackingService.weeklySummary(userId, start);
    SummarySignature latestSignature = signatureFor(latestSummary);
    String latestKey = latestSignature.key();
    if (!Objects.equals(latestKey, cached.signature())) {
      adviceStore.invalidate(userId, start);
    } else {
      adviceStore.refresh(userId, start, cached);
    }
  }

  private SummarySignature signatureFor(NutritionSummary summary) {
    return new SummarySignature(
        summary.days(),
        summary.calories().actual(),
        summary.protein().actual(),
        summary.carbs().actual(),
        summary.fat().actual()
    );
  }

  public record NutritionInsight(NutritionSummary summary, List<MealLog> logs, String aiAdvice) {}

  private record SummarySignature(int days, double calories, double protein, double carbs, double fat) {
    String key() {
      return String.format(Locale.ROOT, "%d|%.2f|%.2f|%.2f|%.2f", days, calories, protein, carbs, fat);
    }
  }

  private LocalDate normaliseWeekStart(LocalDate weekStart) {
    return (weekStart != null ? weekStart : LocalDate.now()).with(DayOfWeek.MONDAY);
  }

  /**
   * Create a minimal profile with default values for advice generation
   * This is used when profile doesn't exist but we still need to generate advice
   * 
   * IMPORTANT: This creates a transient (non-persisted) profile only for reading
   * metadata like fitnessGoal and dietaryPreference for advice generation.
   * It should never be persisted to the database.
   * 
   * @param userId The user ID to create a minimal profile for
   * @return A minimal, transient UserProfile for advice generation only
   */
  private UserProfile createMinimalProfileForAdvice(UUID userId) {
    log.warn("Using minimal default profile for advice generation for userId: {}. This profile will not be persisted.", userId);
    
    // Create a minimal transient profile with only the fields needed for advice
    UserProfile profile = new UserProfile();
    // Note: We don't set user or userId because this is transient and won't be persisted
    profile.setFitnessGoal(com.fitnessapp.backend.user.entity.FitnessGoal.MAINTAIN);
    profile.setDietaryPreference(com.fitnessapp.backend.user.entity.DietaryPreference.NONE);
    
    return profile;
  }
}
