package com.fitnessapp.backend.service.quota;

/**
 * Types of quotas available in the system.
 */
public enum QuotaType {
  /**
   * AI-generated recipe creation quota.
   * Free tier: 10 recipes per day
   */
  AI_RECIPE_GENERATION("ai_recipe_generation", 10, QuotaResetPeriod.DAILY),
  
  /**
   * AI nutrition advice quota.
   * Free tier: 5 advice requests per week
   */
  AI_NUTRITION_ADVICE("ai_nutrition_advice", 5, QuotaResetPeriod.WEEKLY),
  
  /**
   * Pose analysis quota.
   * Free tier: 20 analyses per day
   */
  POSE_ANALYSIS("pose_analysis", 20, QuotaResetPeriod.DAILY);

  private final String key;
  private final int freeLimit;
  private final QuotaResetPeriod resetPeriod;

  QuotaType(String key, int freeLimit, QuotaResetPeriod resetPeriod) {
    this.key = key;
    this.freeLimit = freeLimit;
    this.resetPeriod = resetPeriod;
  }

  public String getKey() {
    return key;
  }

  public int getFreeLimit() {
    return freeLimit;
  }

  public QuotaResetPeriod getResetPeriod() {
    return resetPeriod;
  }
}
