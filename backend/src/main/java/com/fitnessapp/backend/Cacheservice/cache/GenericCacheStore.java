package com.fitnessapp.backend.service.cache;

import java.time.Duration;
import lombok.RequiredArgsConstructor;

/**
 * Generic cache store abstraction that provides a template for working with {@link IndexedCacheFacade}.
 * <p>
 * Subclasses should define:
 * <ul>
 *   <li>Cache name constant</li>
 *   <li>TTL duration</li>
 *   <li>Key generation methods</li>
 * </ul>
 * <p>
 * Example usage:
 * <pre>{@code
 * @Component
 * public class UserPreferencesStore extends GenericCacheStore<UserPreferences> {
 *   private static final String CACHE_NAME = "user-preferences";
 *   private static final Duration TTL = Duration.ofHours(24);
 *
 *   public UserPreferencesStore(IndexedCacheFacade cacheFacade) {
 *     super(cacheFacade, CACHE_NAME, TTL, UserPreferences.class);
 *   }
 *
 *   public UserPreferences get(UUID userId) {
 *     return get(keyFor(userId));
 *   }
 *
 *   public void put(UUID userId, UserPreferences prefs) {
 *     put(indexKeyFor(userId), keyFor(userId), prefs);
 *   }
 *
 *   public void invalidate(UUID userId) {
 *     invalidateNamespace(indexKeyFor(userId));
 *   }
 *
 *   private String keyFor(UUID userId) {
 *     return "user-prefs:" + userId;
 *   }
 *
 *   private String indexKeyFor(UUID userId) {
 *     return "user-prefs:idx:" + userId;
 *   }
 * }
 * }</pre>
 *
 * @param <T> the type of cached value
 */
@RequiredArgsConstructor
public abstract class GenericCacheStore<T> {

  private final IndexedCacheFacade cacheFacade;
  private final String cacheName;
  private final Duration defaultTtl;
  private final Class<T> valueType;

  /**
   * Retrieve a cached value by key.
   *
   * @param key the cache key
   * @return the cached value, or null if not found or expired
   */
  protected T get(String key) {
    return cacheFacade.get(cacheName, key, valueType);
  }

  /**
   * Store a value in the cache with the default TTL.
   *
   * @param indexKey the index key for grouping related entries (e.g., userId)
   * @param key      the specific cache key
   * @param value    the value to cache
   */
  protected void put(String indexKey, String key, T value) {
    put(indexKey, key, value, defaultTtl);
  }

  /**
   * Store a value in the cache with a custom TTL.
   *
   * @param indexKey the index key for grouping related entries
   * @param key      the specific cache key
   * @param value    the value to cache
   * @param ttl      the time-to-live for this entry
   */
  protected void put(String indexKey, String key, T value, Duration ttl) {
    cacheFacade.put(cacheName, indexKey, key, value, ttl);
  }

  /**
   * Refresh an existing cache entry (same as put, but semantically indicates update).
   *
   * @param indexKey the index key
   * @param key      the cache key
   * @param value    the updated value
   */
  protected void refresh(String indexKey, String key, T value) {
    cacheFacade.refresh(cacheName, indexKey, key, value, defaultTtl);
  }

  /**
   * Invalidate all entries under a specific index (e.g., all cache entries for a user).
   *
   * @param indexKey the index key identifying the namespace to clear
   */
  protected void invalidateNamespace(String indexKey) {
    cacheFacade.invalidateNamespace(cacheName, indexKey);
  }

  /**
   * Invalidate a specific cache entry.
   *
   * @param indexKey the index key
   * @param key      the specific entry key to invalidate
   */
  protected void invalidateEntry(String indexKey, String key) {
    cacheFacade.invalidateEntry(cacheName, indexKey, key);
  }

  protected String getCacheName() {
    return cacheName;
  }

  protected Duration getDefaultTtl() {
    return defaultTtl;
  }
}
