package com.fitnessapp.backend.social.service;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;

/**
 * Publishes social events to a Redis Pub/Sub channel so the Go realtime gateway (P2) can fan them out
 * to connected clients. Degrades gracefully to a no-op when Redis is not configured (e.g. prod profile
 * with Redis disabled, or local dev without a Redis server) so social writes never fail on delivery.
 */
@Slf4j
@Component
public class SocialEventPublisher {

    public static final String CHANNEL = "social.events";

    private final ObjectProvider<StringRedisTemplate> redisTemplate;
    private final ObjectMapper objectMapper;

    public SocialEventPublisher(ObjectProvider<StringRedisTemplate> redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public void publish(Object event) {
        StringRedisTemplate template = redisTemplate.getIfAvailable();
        if (template == null) {
            return;
        }
        try {
            template.convertAndSend(CHANNEL, objectMapper.writeValueAsString(event));
        } catch (Exception e) {
            // Realtime delivery is best-effort; the durable feed/notification rows are the source of truth.
            log.debug("Skipped social event publish (Redis unavailable): {}", e.getMessage());
        }
    }
}
