package com.fitnessapp.backend.config;

import java.util.Arrays;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.StringUtils;

@ConfigurationProperties(prefix = "app.google")
public class GoogleProperties {

    /**
     * OAuth client ID used to validate Google ID tokens.
     */
    private String clientId;

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public List<String> getClientIds() {
        if (!StringUtils.hasText(clientId)) {
            return List.of();
        }

        return Arrays.stream(clientId.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .distinct()
                .toList();
    }
}
