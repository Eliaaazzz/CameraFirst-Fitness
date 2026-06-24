package com.fitnessapp.backend.config;

import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

/**
 * Fails application startup in the {@code prod} profile if the JWT secret is unset, the built-in
 * default, or shorter than 256 bits — preventing forgeable tokens in production. In dev/test the
 * default is allowed (with a warning from {@code JwtUtils}), so local runs and tests are unaffected.
 */
@Slf4j
@Component
@Profile("prod")
public class JwtSecretProductionValidator {

    private final String secret;

    public JwtSecretProductionValidator(@Value("${app.jwt.secret:}") String secret) {
        this.secret = secret;
    }

    @PostConstruct
    void validate() {
        if (secret == null || secret.isBlank() || secret.contains("change-me")) {
            throw new IllegalStateException(
                "Refusing to start in 'prod': a strong JWT_SECRET must be set (the built-in default is not allowed).");
        }
        if (secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(
                "Refusing to start in 'prod': JWT_SECRET must be at least 256 bits (32 bytes).");
        }
        log.info("JWT secret validated for production startup.");
    }
}
