package com.fitnessapp.backend.service.cache;

import java.util.UUID;
import org.springframework.data.domain.Sort;

/**
 * Cache key generator for user library (saved workouts and recipes).
 *
 * <p>Key structure follows the pattern:
 * <ul>
 *   <li>List keys: {type}:list:{userId}:p{page}:s{size}:{sortHash}</li>
 *   <li>Index keys: {type}:idx:{userId}</li>
 * </ul>
 *
 * <p>Example keys:
 * <pre>
 * workouts:list:550e8400-e29b-41d4-a716-446655440000:p0:s20:savedAt_DESC
 * workouts:idx:550e8400-e29b-41d4-a716-446655440000
 * </pre>
 */
public final class UserLibraryCacheKeys {

  public static final String WORKOUTS_CACHE = "user-library-workouts";
  public static final String RECIPES_CACHE = "user-library-recipes";

  private UserLibraryCacheKeys() {
    throw new UnsupportedOperationException("Utility class - do not instantiate");
  }

  /**
   * Generates a cache key for a paginated list of saved workouts.
   *
   * @param userId the user ID
   * @param page the page number (0-indexed)
   * @param size the page size
   * @param sort the sort specification
   * @return the cache key
   */
  public static String workoutListKey(UUID userId, int page, int size, Sort sort) {
    return String.format("workouts:list:%s:p%d:s%d:%s",
        userId, page, size, sortToString(sort));
  }

  /**
   * Generates an index key for all workout caches belonging to a user.
   * Used for bulk invalidation when user saves/removes a workout.
   *
   * @param userId the user ID
   * @return the index key
   */
  public static String workoutIndexKey(UUID userId) {
    return "workouts:idx:" + userId;
  }

  /**
   * Generates a cache key for a paginated list of saved recipes.
   *
   * @param userId the user ID
   * @param page the page number (0-indexed)
   * @param size the page size
   * @param sort the sort specification
   * @return the cache key
   */
  public static String recipeListKey(UUID userId, int page, int size, Sort sort) {
    return String.format("recipes:list:%s:p%d:s%d:%s",
        userId, page, size, sortToString(sort));
  }

  /**
   * Generates an index key for all recipe caches belonging to a user.
   * Used for bulk invalidation when user saves/removes a recipe.
   *
   * @param userId the user ID
   * @return the index key
   */
  public static String recipeIndexKey(UUID userId) {
    return "recipes:idx:" + userId;
  }

  /**
   * Converts a Spring Data Sort object to a normalized string representation.
   *
   * <p>Format: {property1}_{direction1},{property2}_{direction2},...
   * <p>Example: "savedAt_DESC,title_ASC"
   *
   * @param sort the sort specification (nullable)
   * @return a normalized string, or "unsorted" if null/empty
   */
  private static String sortToString(Sort sort) {
    if (sort == null || sort.isUnsorted()) {
      return "unsorted";
    }

    StringBuilder sb = new StringBuilder();
    sort.forEach(order -> {
      if (sb.length() > 0) {
        sb.append(",");
      }
      sb.append(order.getProperty())
          .append("_")
          .append(order.getDirection().name());
    });

    return sb.toString();
  }
}
