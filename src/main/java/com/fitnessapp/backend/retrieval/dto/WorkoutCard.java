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
public class WorkoutCard {
    String youtubeId;
    String title;
    Integer durationMinutes;
    String level;
    List<String> equipment;
    List<String> bodyParts;
    String thumbnailUrl;
    Long viewCount;
}
