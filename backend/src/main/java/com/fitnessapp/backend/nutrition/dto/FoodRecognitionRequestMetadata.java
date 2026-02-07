package com.fitnessapp.backend.nutrition.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Optional metadata sent by the client to improve portion scaling.
 *
 * This is intentionally small and forgiving: the client may omit it, or send
 * only one of the supported fields.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FoodRecognitionRequestMetadata {

  /**
   * Real-world width of the entire image in centimeters (preferred key in prompts).
   */
  @JsonProperty("img_w_cm")
  private Double imageWidthCm;

  /**
   * Legacy alias for image width in centimeters.
   */
  @JsonProperty("real_world_width_cm")
  private Double realWorldWidthCm;

  @JsonIgnore
  public Double resolveImageWidthCm() {
    if (imageWidthCm != null) return imageWidthCm;
    return realWorldWidthCm;
  }
}

