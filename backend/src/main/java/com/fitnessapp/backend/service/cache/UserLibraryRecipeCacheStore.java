package com.fitnessapp.backend.service.cache;

import com.fitnessapp.backend.workout.service.UserLibraryService.PageResult;
import com.fitnessapp.backend.workout.service.UserLibraryService.SavedRecipe;
import java.time.Duration;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

/**
 * Cache store for user's saved recipe library.
 *
 * <p>Caches paginated recipe lists to reduce database load.
 * TTL is set to 5 minutes to balance freshness with cache hit ratio.
 *
 * <p>Usage example:
 * <pre>{@code
 * // Read from cache
 * PageResult<SavedRecipe> cached = store.get(userId, 0, 20, sort);
 * if (cached == null) {
 *   // Cache miss - fetch from DB and cache
 *   PageResult<SavedRecipe> result = fetchFromDatabase(...);
 *   store.put(userId, 0, 20, sort, result);
 * }
 *
 * // Invalidate after save/remove
 * store.invalidateAll(userId);
 * }</pre>
 */
@Component
public class UserLibraryRecipeCacheStore
    extends GenericCacheStore<PageResult<SavedRecipe>> {

  private static final Duration TTL = Duration.ofMinutes(5);

  @SuppressWarnings("unchecked")
  public UserLibraryRecipeCacheStore(IndexedCacheFacade cacheFacade) {
    super(
        cacheFacade,
        UserLibraryCacheKeys.RECIPES_CACHE,
        TTL,
        (Class<PageResult<SavedRecipe>>) (Class<?>) PageResult.class
    );
  }

  /**
   * Retrieves cached recipe list for a user.
   *
   * @param userId the user ID
   * @param page the page number (0-indexed)
   * @param size the page size
   * @param sort the sort specification
   * @return the cached result, or null if not found/expired
   */
  public PageResult<SavedRecipe> get(UUID userId, int page, int size, Sort sort) {
    return get(UserLibraryCacheKeys.recipeListKey(userId, page, size, sort));
  }

  /**
   * Caches a recipe list result.
   *
   * @param userId the user ID
   * @param page the page number
   * @param size the page size
   * @param sort the sort specification
   * @param result the page result to cache
   */
  public void put(UUID userId, int page, int size, Sort sort, PageResult<SavedRecipe> result) {
    put(
        UserLibraryCacheKeys.recipeIndexKey(userId),
        UserLibraryCacheKeys.recipeListKey(userId, page, size, sort),
        result
    );
  }

  /**
   * Invalidates all cached recipe lists for a user.
   * Called after save/remove operations to ensure consistency.
   *
   * @param userId the user ID
   */
  public void invalidateAll(UUID userId) {
    invalidateNamespace(UserLibraryCacheKeys.recipeIndexKey(userId));
  }
}
