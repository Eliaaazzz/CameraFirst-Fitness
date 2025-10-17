package com.fitnessapp.backend.retrieval.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@Builder
@Jacksonized
@JsonInclude(JsonInclude.Include.NON_NULL)
public class WorkoutResponse {
    List<WorkoutCard> workouts;
    String detectedEquipment;
    String detectedLevel;
    Integer targetDurationMinutes;
    Integer latencyMs;
}
