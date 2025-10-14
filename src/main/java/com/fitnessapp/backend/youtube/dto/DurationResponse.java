package com.fitnessapp.backend.youtube.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Value;

/**
 * Response DTO for duration parsing endpoint.
 * Represents the conversion of ISO 8601 duration format to minutes.
 */
@Value
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DurationResponse {
    /**
     * Original ISO 8601 duration string (e.g., "PT15M30S")
     */
    String iso;
    
    /**
     * Duration converted to total minutes (e.g., 15)
     */
    int minutes;
}
