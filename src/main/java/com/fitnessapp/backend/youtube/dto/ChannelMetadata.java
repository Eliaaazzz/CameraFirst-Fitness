package com.fitnessapp.backend.youtube.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.extern.jackson.Jacksonized;

@Builder
@Jacksonized
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ChannelMetadata(String channelId, String title, long subscriberCount) {
}
