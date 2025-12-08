package com.fitnessapp.backend.nutrition.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitnessapp.backend.nutrition.entity.MealLog;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository;
import com.fitnessapp.backend.nutrition.service.NutritionTrackingService.NutritionSummary;
import com.fitnessapp.backend.service.cache.NutritionAdviceStore;
import com.fitnessapp.backend.service.cache.NutritionAdviceStore.AdviceEntry;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class NutritionInsightService {

  private final NutritionTrackingService trackingService;
  private final MealLogRepository mealLogRepository;
  private final NutritionAdviceStore adviceStore;

  public NutritionInsightService(
      NutritionTrackingService trackingService,
      MealLogRepository mealLogRepository,
      NutritionAdviceStore adviceStore) {
    this.trackingService = trackingService;
    this.mealLogRepository = mealLogRepository;
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
      aiAdvice = buildFallbackAdvice(summary);
      AdviceEntry entry = new AdviceEntry(signatureKey, aiAdvice);
      adviceStore.put(userId, start, entry);
    }

    return new NutritionInsight(summary, logs, aiAdvice);
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
        summary.calories().actual().doubleValue(),
        summary.protein().actual().doubleValue(),
        summary.carbs().actual().doubleValue(),
        summary.fat().actual().doubleValue()
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
}
