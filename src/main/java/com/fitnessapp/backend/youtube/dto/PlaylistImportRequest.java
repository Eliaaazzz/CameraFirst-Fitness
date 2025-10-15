package com.fitnessapp.backend.youtube.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import lombok.Builder;
import lombok.extern.jackson.Jacksonized;

@Builder
@Jacksonized
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PlaylistImportRequest(
        String playlistId,
        String alias,
        String equipment,
        List<String> equipmentList,
        String level,
        List<String> bodyParts,
        Integer targetCount,
        Integer maxDurationSeconds,
        Long minViewCount,
        Long minSubscriberCount) {

    @JsonIgnore
    public int targetCountOrDefault() {
        return targetCount != null && targetCount > 0 ? targetCount : 15;
    }

    @JsonIgnore
    public int maxDurationSecondsOrDefault() {
        return maxDurationSeconds != null && maxDurationSeconds > 0 ? maxDurationSeconds : 300; // 5 minutes
    }

    @JsonIgnore
    public long minViewCountOrDefault() {
        return minViewCount != null && minViewCount > 0 ? minViewCount : 50_000L;
    }

    @JsonIgnore
    public long minSubscriberCountOrDefault() {
        return minSubscriberCount != null && minSubscriberCount > 0 ? minSubscriberCount : 100_000L;
    }
}
