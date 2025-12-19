package com.fitnessapp.backend.nutrition.service.core;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitnessapp.backend.Cacheservice.cache.NutritionAdviceStore;
import com.fitnessapp.backend.Cacheservice.cache.NutritionAdviceStore.AdviceEntry;
import com.fitnessapp.backend.nutrition.entity.MealLog;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository;
import com.fitnessapp.backend.nutrition.service.core.NutritionTrackingService.NutritionSummary;

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
