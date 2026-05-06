package com.fitnessapp.backend.behavior.predicate;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitnessapp.backend.nutrition.entity.MealLog;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

import org.junit.jupiter.api.Test;

class DefaultBehaviorPredicatesTest {

  private final Map<String, BehaviorPredicate> by =
      DefaultBehaviorPredicates.all().stream()
          .collect(java.util.stream.Collectors.toMap(BehaviorPredicate::key, Function.identity()));

  // ----- breakfast_logged ---------------------------------------------------

  @Test
  void breakfastLogged_trueWhenAnyMealBeforeTen() {
    BehaviorPredicate p = by.get("breakfast_logged");
    assertThat(p.evaluate(List.of(meal(8, "breakfast", 30, 400)))).isTrue();
    assertThat(p.evaluate(List.of(meal(11, "lunch", 30, 600)))).isFalse();
    assertThat(p.evaluate(List.of(meal(11, "lunch", 30, 600), meal(9, "breakfast", 25, 350)))).isTrue();
  }

  // ----- late_eating --------------------------------------------------------

  @Test
  void lateEating_trueWhenAnyMealAtOrAfterNine() {
    BehaviorPredicate p = by.get("late_eating");
    assertThat(p.evaluate(List.of(meal(21, "snack", 10, 200)))).isTrue();
    assertThat(p.evaluate(List.of(meal(20, "dinner", 30, 500)))).isFalse();
  }

  // ----- meal_count_3_or_more ----------------------------------------------

  @Test
  void mealCount_thresholdAtThree() {
    BehaviorPredicate p = by.get("meal_count_3_or_more");
    assertThat(p.evaluate(List.of(meal(8, "breakfast", 20, 300), meal(13, "lunch", 30, 500)))).isFalse();
    assertThat(p.evaluate(List.of(
        meal(8, "breakfast", 20, 300),
        meal(13, "lunch", 30, 500),
        meal(19, "dinner", 30, 600)))).isTrue();
  }

  // ----- protein_goal_hit / protein_high -----------------------------------

  @Test
  void proteinGoals_useSummedGrams() {
    BehaviorPredicate goal = by.get("protein_goal_hit");
    BehaviorPredicate high = by.get("protein_high");
    List<MealLog> day = List.of(
        meal(8, "breakfast", 30, 400),
        meal(13, "lunch", 30, 600),
        meal(19, "dinner", 20, 500)
    );
    assertThat(goal.evaluate(day)).isTrue();   // 80g >= 75g
    assertThat(high.evaluate(day)).isFalse();  // 80g < 100g
  }

  // ----- calories_in_range --------------------------------------------------

  @Test
  void caloriesInRange_outOfRange() {
    BehaviorPredicate p = by.get("calories_in_range");
    assertThat(p.evaluate(List.of(meal(13, "lunch", 30, 1000)))).isFalse();   // 1000 < 1200
    assertThat(p.evaluate(List.of(meal(13, "lunch", 30, 2500)))).isFalse();   // 2500 > 2400
    assertThat(p.evaluate(List.of(meal(13, "lunch", 30, 1200), meal(19, "dinner", 30, 800)))).isTrue();
  }

  // ----- varied_meal_types --------------------------------------------------

  @Test
  void variedMealTypes_distinctCountThree() {
    BehaviorPredicate p = by.get("varied_meal_types");
    assertThat(p.evaluate(List.of(
        meal(8, "breakfast", 30, 400),
        meal(13, "lunch", 30, 500),
        meal(19, "dinner", 30, 500)))).isTrue();
    assertThat(p.evaluate(List.of(
        meal(8, "breakfast", 30, 400),
        meal(13, "snack", 30, 500)))).isFalse();
  }

  // ----- protein_per_meal_decent -------------------------------------------

  @Test
  void proteinPerMealDecent_emptyDayIsFalse() {
    BehaviorPredicate p = by.get("protein_per_meal_decent");
    assertThat(p.evaluate(List.of())).isFalse();
    assertThat(p.evaluate(List.of(meal(13, "lunch", 25, 500)))).isTrue();
    assertThat(p.evaluate(List.of(meal(13, "lunch", 10, 500), meal(19, "dinner", 5, 400)))).isFalse();
  }

  // ----- empty days ---------------------------------------------------------

  @Test
  void allPredicates_returnFalseOnEmptyDay() {
    for (BehaviorPredicate p : DefaultBehaviorPredicates.all()) {
      assertThat(p.evaluate(List.of()))
          .as("predicate %s on empty day", p.key())
          .isFalse();
    }
  }

  // -------- helpers --------------------------------------------------------

  private static MealLog meal(int hour, String type, int proteinG, int calories) {
    OffsetDateTime at = OffsetDateTime.of(2026, 5, 1, hour, 0, 0, 0, ZoneOffset.UTC);
    return MealLog.builder()
        .userId(UUID.randomUUID())
        .mealType(type)
        .consumedAt(at)
        .calories(calories)
        .proteinGrams(BigDecimal.valueOf(proteinG))
        .build();
  }
}
