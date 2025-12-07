package com.fitnessapp.backend.recipe.service;

import com.fitnessapp.backend.recipe.entity.MealPlan;
import com.fitnessapp.backend.recipe.service.SmartRecipeService.MealPlanResponse;
import com.fitnessapp.backend.recipe.service.SmartRecipeService.NutritionTarget;
import com.fitnessapp.backend.recipe.repository.MealPlanRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class MealPlanHistoryService {

  private final MealPlanRepository mealPlanRepository;

  @Transactional
  public MealPlan storePlan(UUID userId, MealPlanResponse response, String source, String payload) {
    NutritionTarget target = response.target();
    MealPlan entity = MealPlan.builder()
        .userId(userId)
        .generatedAt(OffsetDateTime.now())
        .planPayload(payload)
        .source(source)
        .caloriesTarget(target != null ? target.calories() : null)
        .proteinTarget(target != null ? target.protein() : null)
        .carbsTarget(target != null ? target.carbs() : null)
        .fatTarget(target != null ? target.fat() : null)
        .build();
    return mealPlanRepository.save(entity);
  }

  @Transactional(readOnly = true)
  public List<MealPlan> recentPlans(UUID userId, int limit) {
    List<MealPlan> plans = mealPlanRepository.findTop10ByUserIdOrderByGeneratedAtDesc(userId);
    if (limit > 0 && plans.size() > limit) {
      return plans.subList(0, limit);
    }
    return plans;
  }

  @Transactional(readOnly = true)
  public Optional<MealPlan> latestPlan(UUID userId) {
    List<MealPlan> plans = mealPlanRepository.findTop10ByUserIdOrderByGeneratedAtDesc(userId);
    return plans.isEmpty() ? Optional.empty() : Optional.of(plans.get(0));
  }

  @Transactional(readOnly = true)
  public Optional<MealPlan> planForWeek(UUID userId, LocalDate weekStart) {
    OffsetDateTime start = weekStart.atStartOfDay().atOffset(ZoneOffset.UTC);
    OffsetDateTime end = start.plusDays(7);
    List<MealPlan> plans = mealPlanRepository.findByUserIdAndGeneratedAtBetweenOrderByGeneratedAtDesc(userId, start, end);
    return plans.isEmpty() ? Optional.empty() : Optional.of(plans.get(0));
  }
}
