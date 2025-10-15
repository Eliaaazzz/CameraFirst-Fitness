package com.fitnessapp.backend.youtube.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.Map;
import lombok.Builder;
import lombok.extern.jackson.Jacksonized;

@Builder
@Jacksonized
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CuratedCoverageReport(
        int totalVideos,
        Map<String, Long> levelCounts,
        Map<String, Long> categoryCounts,
        List<String> missingCategories,
        List<String> warnings) {
}
