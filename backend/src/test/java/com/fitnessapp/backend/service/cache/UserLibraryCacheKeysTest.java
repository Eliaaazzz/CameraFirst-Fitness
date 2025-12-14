package com.fitnessapp.backend.service.cache;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;

import com.fitnessapp.backend.Cacheservice.cache.UserLibraryCacheKeys;

class UserLibraryCacheKeysTest {

  @Test
  void generatesConsistentWorkoutListKeys() {
    UUID userId = UUID.randomUUID();
    Sort sort = Sort.by(Sort.Direction.DESC, "savedAt");

    String key1 = UserLibraryCacheKeys.workoutListKey(userId, 0, 20, sort);
    String key2 = UserLibraryCacheKeys.workoutListKey(userId, 0, 20, sort);

    assertThat(key1).isEqualTo(key2);
  }

  @Test
  void generatesDifferentKeysForDifferentPages() {
    UUID userId = UUID.randomUUID();
    Sort sort = Sort.by(Sort.Direction.DESC, "savedAt");

    String key1 = UserLibraryCacheKeys.workoutListKey(userId, 0, 20, sort);
    String key2 = UserLibraryCacheKeys.workoutListKey(userId, 1, 20, sort);

    assertThat(key1).isNotEqualTo(key2);
  }

  @Test
  void generatesDifferentKeysForDifferentSortDirections() {
    UUID userId = UUID.randomUUID();
    Sort sort1 = Sort.by(Sort.Direction.DESC, "savedAt");
    Sort sort2 = Sort.by(Sort.Direction.ASC, "savedAt");

    String key1 = UserLibraryCacheKeys.workoutListKey(userId, 0, 20, sort1);
    String key2 = UserLibraryCacheKeys.workoutListKey(userId, 0, 20, sort2);

    assertThat(key1).isNotEqualTo(key2);
  }

  @Test
  void generatesDifferentKeysForDifferentSortFields() {
    UUID userId = UUID.randomUUID();
    Sort sort1 = Sort.by(Sort.Direction.DESC, "savedAt");
    Sort sort2 = Sort.by(Sort.Direction.DESC, "workout.durationMinutes");

    String key1 = UserLibraryCacheKeys.workoutListKey(userId, 0, 20, sort1);
    String key2 = UserLibraryCacheKeys.workoutListKey(userId, 0, 20, sort2);

    assertThat(key1).isNotEqualTo(key2);
  }

  @Test
  void handlesUnsortedGracefully() {
    UUID userId = UUID.randomUUID();

    String key1 = UserLibraryCacheKeys.workoutListKey(userId, 0, 20, null);
    String key2 = UserLibraryCacheKeys.workoutListKey(userId, 0, 20, Sort.unsorted());

    assertThat(key1).isEqualTo(key2);
    assertThat(key1).contains("unsorted");
  }

  @Test
  void generatesConsistentRecipeListKeys() {
    UUID userId = UUID.randomUUID();
    Sort sort = Sort.by(Sort.Direction.DESC, "savedAt");

    String key1 = UserLibraryCacheKeys.recipeListKey(userId, 0, 20, sort);
    String key2 = UserLibraryCacheKeys.recipeListKey(userId, 0, 20, sort);

    assertThat(key1).isEqualTo(key2);
  }

  @Test
  void workoutAndRecipeKeysAreDifferent() {
    UUID userId = UUID.randomUUID();
    Sort sort = Sort.by(Sort.Direction.DESC, "savedAt");

    String workoutKey = UserLibraryCacheKeys.workoutListKey(userId, 0, 20, sort);
    String recipeKey = UserLibraryCacheKeys.recipeListKey(userId, 0, 20, sort);

    assertThat(workoutKey).isNotEqualTo(recipeKey);
  }

  @Test
  void indexKeysAreDifferentFromListKeys() {
    UUID userId = UUID.randomUUID();
    Sort sort = Sort.by(Sort.Direction.DESC, "savedAt");

    String listKey = UserLibraryCacheKeys.workoutListKey(userId, 0, 20, sort);
    String indexKey = UserLibraryCacheKeys.workoutIndexKey(userId);

    assertThat(listKey).isNotEqualTo(indexKey);
    assertThat(indexKey).contains("idx");
  }

  @Test
  void workoutListKeyContainsAllParameters() {
    UUID userId = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    Sort sort = Sort.by(Sort.Direction.DESC, "savedAt");

    String key = UserLibraryCacheKeys.workoutListKey(userId, 2, 50, sort);

    assertThat(key).contains("550e8400-e29b-41d4-a716-446655440000");
    assertThat(key).contains("p2");
    assertThat(key).contains("s50");
    assertThat(key).contains("savedAt");
    assertThat(key).contains("DESC");
  }

  @Test
  void recipeListKeyContainsAllParameters() {
    UUID userId = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    Sort sort = Sort.by(Sort.Direction.ASC, "recipe.timeMinutes");

    String key = UserLibraryCacheKeys.recipeListKey(userId, 1, 10, sort);

    assertThat(key).contains("550e8400-e29b-41d4-a716-446655440000");
    assertThat(key).contains("p1");
    assertThat(key).contains("s10");
    assertThat(key).contains("recipe.timeMinutes");
    assertThat(key).contains("ASC");
  }
}
