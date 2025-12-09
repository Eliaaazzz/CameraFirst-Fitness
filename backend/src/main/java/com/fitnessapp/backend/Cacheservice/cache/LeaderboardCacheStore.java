package com.fitnessapp.backend.service.cache;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Cache store for leaderboard snapshots indexed by owner and scope.
 * Extends {@link GenericCacheStore} to leverage the common cache pattern.
 */
@Component
public class LeaderboardCacheStore extends GenericCacheStore<LeaderboardCacheStore.LeaderboardSnapshot> {

  private static final Duration FALLBACK_TTL = Duration.ofMinutes(30);

  public LeaderboardCacheStore(IndexedCacheFacade cacheFacade) {
    super(cacheFacade, LeaderboardCacheKeys.LEADERBOARD_CACHE, FALLBACK_TTL, LeaderboardSnapshot.class);
  }

  public LeaderboardSnapshot get(String owner, String scope) {
    return get(LeaderboardCacheKeys.leaderboardKey(owner, scope));
  }

  public void put(String owner, String scope, LeaderboardSnapshot snapshot) {
    put(
        LeaderboardCacheKeys.leaderboardIndexKey(owner),
        LeaderboardCacheKeys.leaderboardKey(owner, scope),
        snapshot);
  }

  public void invalidate(String owner) {
    invalidateNamespace(LeaderboardCacheKeys.leaderboardIndexKey(owner));
  }

  public void invalidate(String owner, String scope) {
    invalidateEntry(
        LeaderboardCacheKeys.leaderboardIndexKey(owner),
        LeaderboardCacheKeys.leaderboardKey(owner, scope));
  }

  public record LeaderboardSnapshot(
      List<Entry> entries,
      OffsetDateTime generatedAt
  ) {
  }

  public record Entry(
      UUID userId,
      String displayName,
      int position,
      int streak,
      int score
  ) {
  }
}
