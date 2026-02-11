package com.fitnessapp.backend.nutrition.service.core;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitnessapp.backend.nutrition.entity.MealLog;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository;
import com.fitnessapp.backend.nutrition.service.core.NutritionTrackingService.NutritionSummary;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class NutritionInsightService {

  private final NutritionTrackingService trackingService;
  private final MealLogRepository mealLogRepository;

  public NutritionInsightService(
      NutritionTrackingService trackingService,
      MealLogRepository mealLogRepository) {
    this.trackingService = trackingService;
    this.mealLogRepository = mealLogRepository;
  }

  @Transactional(readOnly = true)
  public NutritionInsight generateWeeklyInsight(UUID userId, LocalDate weekStart) {
    LocalDate start = normaliseWeekStart(weekStart);
    NutritionSummary summary = trackingService.weeklySummary(userId, start);

    OffsetDateTime rangeStart = summary.rangeStart();
    OffsetDateTime rangeEnd = summary.rangeEnd();

    List<MealLog> logs = mealLogRepository.findByUserIdAndConsumedAtBetweenOrderByConsumedAtAsc(
        userId, rangeStart, rangeEnd);

    String aiAdvice = buildFallbackAdvice(summary);

    return new NutritionInsight(summary, logs, aiAdvice);
  }

  private String buildFallbackAdvice(NutritionSummary summary) {
    StringBuilder advice = new StringBuilder();

    advice.append("Nutrition Analysis:\n\n");

    // Analyze positive aspects
    advice.append("✓ Positive Aspects:\n");
    if (summary.calories().percent() >= 90 && summary.calories().percent() <= 110) {
      advice.append("• Good calorie intake control\n");
    }
    if (summary.protein().percent() >= 90) {
      advice.append("• Adequate protein intake\n");
    }
    if (advice.length() == advice.indexOf("✓ Positive Aspects:\n") + "✓ Positive Aspects:\n".length()) {
      advice.append("• Keep up the good habit of tracking your meals\n");
    }

    advice.append("\n⚠ Areas to Watch:\n");
    if (!summary.alerts().isEmpty()) {
      for (String alert : summary.alerts()) {
        advice.append("• ").append(alert).append("\n");
      }
    } else {
      advice.append("• Your nutrition intake is generally balanced\n");
    }

    advice.append("\n→ Suggestions for Improvement:\n");
    if (summary.protein().percent() < 80) {
      advice.append("• Increase quality protein intake (chicken breast, fish, legumes)\n");
    }
    if (summary.calories().percent() > 110) {
      advice.append("• Consider reducing total calories and increasing vegetable portions\n");
    }
    if (summary.carbs().percent() > 110) {
      advice.append("• Choose complex carbohydrates (whole wheat, brown rice, oats)\n");
    }
    if (advice.length() == advice.lastIndexOf("\n→ Suggestions for Improvement:\n") + "\n→ Suggestions for Improvement:\n".length()) {
      advice.append("• Maintain a balanced diet with regular meals\n");
      advice.append("• Stay hydrated - drink at least 8 glasses of water daily\n");
      advice.append("• Increase your intake of fruits and vegetables\n");
    }

    return advice.toString();
  }

  public void invalidate(UUID userId) {
    // no-op: advice cache disabled
  }

  public void invalidate(UUID userId, LocalDate weekStart) {
    // no-op: advice cache disabled
  }

  public void invalidateIfChanged(UUID userId, LocalDate referenceDate) {
    // no-op: advice cache disabled
  }

  public record NutritionInsight(NutritionSummary summary, List<MealLog> logs, String aiAdvice) {}

  private LocalDate normaliseWeekStart(LocalDate weekStart) {
    return (weekStart != null ? weekStart : LocalDate.now()).with(DayOfWeek.MONDAY);
  }
}
