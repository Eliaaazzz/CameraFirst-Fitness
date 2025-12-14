package com.fitnessapp.backend.api.quota;

import com.fitnessapp.backend.Cacheservice.quota.QuotaService;
import com.fitnessapp.backend.Cacheservice.quota.QuotaType;
import com.fitnessapp.backend.Cacheservice.quota.QuotaUsage;
import com.fitnessapp.backend.api.common.ApiEnvelope;
import com.fitnessapp.backend.security.AuthenticatedUser;
import com.fitnessapp.backend.security.CurrentUser;

import java.time.ZoneId;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * REST API for querying user quotas.
 */
@RestController
@RequestMapping("/api/v1/quotas")
@RequiredArgsConstructor
@Slf4j
public class QuotaController {

  private final QuotaService quotaService;
  private final CurrentUser currentUser;

  /**
   * Get quota usage for AI recipe generation.
   */
  @GetMapping("/recipe")
  public ApiEnvelope<QuotaUsage> getRecipeQuota(
      @RequestParam(required = false) UUID userId,
      @RequestParam(required = false) String timezone) {
    
    UUID effectiveUserId = resolveUserId(userId);
    ZoneId zoneId = resolveTimezone(timezone);
    
    log.trace("API request: get recipe quota for user {} (timezone={})", effectiveUserId, zoneId);
    QuotaUsage usage = quotaService.checkQuota(effectiveUserId, QuotaType.AI_RECIPE_GENERATION, zoneId);
    
    return ApiEnvelope.of(usage);
  }

  /**
   * Get quota usage for AI nutrition advice.
   */
  @GetMapping("/nutrition")
  public ApiEnvelope<QuotaUsage> getNutritionQuota(
      @RequestParam(required = false) UUID userId,
      @RequestParam(required = false) String timezone) {
    
    UUID effectiveUserId = resolveUserId(userId);
    ZoneId zoneId = resolveTimezone(timezone);
    
    log.trace("API request: get nutrition quota for user {} (timezone={})", effectiveUserId, zoneId);
    QuotaUsage usage = quotaService.checkQuota(effectiveUserId, QuotaType.AI_NUTRITION_ADVICE, zoneId);
    
    return ApiEnvelope.of(usage);
  }

  /**
   * Get quota usage for pose analysis.
   */
  @GetMapping("/pose")
  public ApiEnvelope<QuotaUsage> getPoseQuota(
      @RequestParam(required = false) UUID userId,
      @RequestParam(required = false) String timezone) {
    
    UUID effectiveUserId = resolveUserId(userId);
    ZoneId zoneId = resolveTimezone(timezone);
    
    log.trace("API request: get pose quota for user {} (timezone={})", effectiveUserId, zoneId);
    QuotaUsage usage = quotaService.checkQuota(effectiveUserId, QuotaType.POSE_ANALYSIS, zoneId);
    
    return ApiEnvelope.of(usage);
  }

  /**
   * Get all quotas for the authenticated user.
   */
  @GetMapping
  public ApiEnvelope<Map<String, QuotaUsage>> getAllQuotas(
      @RequestParam(required = false) UUID userId,
      @RequestParam(required = false) String timezone) {
    
    UUID effectiveUserId = resolveUserId(userId);
    ZoneId zoneId = resolveTimezone(timezone);
    
    log.trace("API request: get all quotas for user {} (timezone={})", effectiveUserId, zoneId);
    Map<QuotaType, QuotaUsage> quotas = quotaService.getAllQuotas(effectiveUserId, zoneId);
    
    // Convert QuotaType enum keys to string keys for JSON serialization
    Map<String, QuotaUsage> result = quotas.entrySet().stream()
        .collect(java.util.stream.Collectors.toMap(
            e -> e.getKey().getKey(),
            Map.Entry::getValue
        ));
    
    return ApiEnvelope.of(result);
  }

  /**
   * Get specific quota by type.
   */
  @GetMapping("/{type}")
  public ApiEnvelope<QuotaUsage> getQuotaByType(
      @PathVariable String type,
      @RequestParam(required = false) UUID userId,
      @RequestParam(required = false) String timezone) {
    
    UUID effectiveUserId = resolveUserId(userId);
    ZoneId zoneId = resolveTimezone(timezone);
    
    QuotaType quotaType = parseQuotaType(type);
    
    log.trace("API request: get {} quota for user {} (timezone={})", type, effectiveUserId, zoneId);
    QuotaUsage usage = quotaService.checkQuota(effectiveUserId, quotaType, zoneId);
    
    return ApiEnvelope.of(usage);
  }

  private UUID resolveUserId(UUID requestUserId) {
    UUID authenticatedId = currentUser.get()
        .map(AuthenticatedUser::userId)
        .orElse(null);
    
    if (requestUserId == null) {
      if (authenticatedId == null) {
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing authenticated user context");
      }
      return authenticatedId;
    }
    
    if (authenticatedId != null && !authenticatedId.equals(requestUserId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "userId does not match authenticated principal");
    }
    
    return requestUserId;
  }

  private ZoneId resolveTimezone(String timezone) {
    if (timezone == null || timezone.isBlank()) {
      return ZoneId.systemDefault();
    }
    
    try {
      return ZoneId.of(timezone);
    } catch (Exception ex) {
      log.warn("Invalid timezone {}, using system default", timezone);
      return ZoneId.systemDefault();
    }
  }

  private QuotaType parseQuotaType(String type) {
    for (QuotaType quotaType : QuotaType.values()) {
      if (quotaType.getKey().equalsIgnoreCase(type)) {
        return quotaType;
      }
    }
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown quota type: " + type);
  }
}
