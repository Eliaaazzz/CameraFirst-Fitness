package com.fitnessapp.backend.Cacheservice.cache;

import com.fitnessapp.backend.workout.service.UserLibraryService.PageResult;
import com.fitnessapp.backend.workout.service.UserLibraryService.SavedWorkout;
import java.time.Duration;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

/**
 * Cache store for user's saved workout library.
 */
@Component
public class UserLibraryWorkoutCacheStore
    extends GenericCacheStore<PageResult<SavedWorkout>> {

  private static final Duration TTL = Duration.ofMinutes(5);

  @SuppressWarnings("unchecked")
  public UserLibraryWorkoutCacheStore(IndexedCacheFacade cacheFacade) {
    super(
        cacheFacade,
        UserLibraryCacheKeys.WORKOUTS_CACHE,
        TTL,
        (Class<PageResult<SavedWorkout>>) (Class<?>) PageResult.class
    );
  }

  public PageResult<SavedWorkout> get(UUID userId, int page, int size, Sort sort) {
    return get(UserLibraryCacheKeys.workoutListKey(userId, page, size, sort));
  }

  public void put(UUID userId, int page, int size, Sort sort, PageResult<SavedWorkout> result) {
    put(
        UserLibraryCacheKeys.workoutIndexKey(userId),
        UserLibraryCacheKeys.workoutListKey(userId, page, size, sort),
        result
    );
  }

  public void invalidateAll(UUID userId) {
    invalidateNamespace(UserLibraryCacheKeys.workoutIndexKey(userId));
  }
}
