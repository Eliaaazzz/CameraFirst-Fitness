package com.fitnessapp.backend.service.cache;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

/**
 * Thin facade over Spring's {@link CacheManager} that keeps track of cache keys grouped by a logical index
 * (e.g. per-user) and provides an in-memory fallback when no cache provider is configured.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class IndexedCacheFacade {

  private final CacheManager cacheManager;

  @Autowired(required = false)
  private StringRedisTemplate redisTemplate;

  private final ConcurrentHashMap<String, CacheRecord> fallback = new ConcurrentHashMap<>();
  private final ConcurrentHashMap<String, Set<String>> fallbackIndex = new ConcurrentHashMap<>();

  public <T> T get(String cacheName, String key, Class<T> type) {
    Cache cache = resolve(cacheName);
    if (cache != null) {
      T cached = cache.get(key, type);
      if (cached != null) {
        return cached;
      }
    }
    CacheRecord record = fallback.get(key);
    if (record == null || record.isExpired()) {
      fallback.remove(key);
      return null;
    }
    Object value = record.value();
    if (type.isInstance(value)) {
      return type.cast(value);
    }
    log.warn("Cached value of type {} cannot be cast to {}", value != null ? value.getClass() : "null", type);
    return null;
  }

  public <T> void put(String cacheName, String indexKey, String key, T value, Duration fallbackTtl) {
    Objects.requireNonNull(cacheName, "cacheName must not be null");
    Objects.requireNonNull(key, "key must not be null");
    Cache cache = resolve(cacheName);
    if (cache != null) {
      cache.put(key, value);
    }
    Duration ttl = fallbackTtl == null ? Duration.ofHours(1) : fallbackTtl;
    fallback.put(key, new CacheRecord(value, Instant.now().plus(ttl)));
    registerKey(indexKey, key);
  }

  public <T> void refresh(String cacheName, String indexKey, String key, T value, Duration fallbackTtl) {
    put(cacheName, indexKey, key, value, fallbackTtl);
  }

  public void invalidateNamespace(String cacheName, String indexKey) {
    Cache cache = resolve(cacheName);
    if (cache != null) {
      evictCacheKeys(cache, indexKey);
    }
    evictFallbackKeys(indexKey);
  }

  public void invalidateEntry(String cacheName, String indexKey, String key) {
    Cache cache = resolve(cacheName);
    if (cache != null) {
      cache.evictIfPresent(key);
    }
    fallback.remove(key);
    fallbackIndex.computeIfPresent(indexKey, (k, keys) -> {
      keys.remove(key);
      return keys.isEmpty() ? null : keys;
    });
    if (redisTemplate != null) {
      redisTemplate.opsForSet().remove(indexKey, key);
    }
  }

  private void registerKey(@Nullable String indexKey, String key) {
    if (indexKey == null || indexKey.isBlank()) {
      return;
    }
    if (redisTemplate != null) {
      redisTemplate.opsForSet().add(indexKey, key);
    }
    fallbackIndex.compute(indexKey, (idx, keys) -> {
      if (keys == null) {
        keys = ConcurrentHashMap.newKeySet();
      }
      keys.add(key);
      return keys;
    });
  }

  private void evictCacheKeys(Cache cache, String indexKey) {
    if (redisTemplate == null || indexKey == null || indexKey.isBlank()) {
      return;
    }
    Set<String> keys = redisTemplate.opsForSet().members(indexKey);
    if (keys != null) {
      keys.forEach(cache::evictIfPresent);
    }
    redisTemplate.delete(indexKey);
  }

  private void evictFallbackKeys(String indexKey) {
    if (indexKey == null || indexKey.isBlank()) {
      return;
    }
    Set<String> keys = fallbackIndex.remove(indexKey);
    if (keys != null) {
      keys.forEach(fallback::remove);
    }
  }

  private Cache resolve(String cacheName) {
    try {
      return cacheManager.getCache(cacheName);
    } catch (IllegalStateException ex) {
      log.warn("Cache manager not ready for {}", cacheName, ex);
      return null;
    }
  }

  private record CacheRecord(Object value, Instant expiresAt) {
    boolean isExpired() {
      return Instant.now().isAfter(expiresAt);
    }
  }
}
