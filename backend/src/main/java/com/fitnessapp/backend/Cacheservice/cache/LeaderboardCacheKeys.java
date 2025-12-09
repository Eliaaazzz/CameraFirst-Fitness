package com.fitnessapp.backend.service.cache;

public final class LeaderboardCacheKeys {

  public static final String LEADERBOARD_CACHE = "leaderboard";
  private static final String LEADERBOARD_PREFIX = "leaderboard:";

  private LeaderboardCacheKeys() {}

  public static String leaderboardKey(String owner, String scope) {
    return LEADERBOARD_PREFIX + owner + ":" + scope;
  }

  public static String leaderboardIndexKey(String owner) {
    return LEADERBOARD_PREFIX + owner + ":index";
  }
}
