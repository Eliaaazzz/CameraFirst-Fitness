package com.fitnessapp.backend.youtube.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@Builder
@Jacksonized
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PlaylistImportResult {
    String playlistId;
    String playlistAlias;
    int requestedCount;
    int importedCount;
    int updatedCount;
    int rejectedCount;
    int inspectedCount;
    List<String> reviewNotes;
}
