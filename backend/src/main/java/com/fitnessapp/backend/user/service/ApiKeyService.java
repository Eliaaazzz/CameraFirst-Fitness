package com.fitnessapp.backend.user.service;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.fitnessapp.backend.user.entity.ApiKey;
import com.fitnessapp.backend.user.repository.ApiKeyRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ApiKeyService {

    private static final char[] KEY_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".toCharArray();
    private static final int DEFAULT_KEY_LENGTH = 40;

    private final SecureRandom secureRandom = new SecureRandom();
    private final ApiKeyRepository apiKeyRepository;

    @Transactional
    public ApiKey createKey(String name, String tenantId) {
        String value = generateUniqueKey(DEFAULT_KEY_LENGTH);
        ApiKey apiKey = ApiKey.builder()
            .name(name)
            .tenantId(tenantId)
            .key(value)
            .enabled(true)
            .build();
        return apiKeyRepository.save(apiKey);
    }

    @Transactional(readOnly = true)
    public List<ApiKey> listKeys() {
        return apiKeyRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    @Transactional
    public Optional<ApiKey> validateKey(String key) {
        if (!StringUtils.hasText(key)) {
            return Optional.empty();
        }

        return apiKeyRepository.findByKey(key.trim())
            .filter(ApiKey::isEnabled)
            .map(found -> {
                found.setLastUsedAt(OffsetDateTime.now());
                return found;
            });
    }

    /**
     * Check if API Key is valid (simplified boolean version)
     * Currently not used by ApiKeyAuthFilter (which uses hardcoded config)
     * but available for admin endpoints or future features
     * @param key The API Key to validate
     * @return true if key is valid and enabled, false otherwise
     */
    @Transactional(readOnly = true)
    public boolean isValidApiKey(String key) {
        if (!StringUtils.hasText(key)) {
            return false;
        }
        return apiKeyRepository.findByKey(key.trim())
            .map(ApiKey::isEnabled)
            .orElse(false);
    }

    @Transactional
    public boolean revokeKey(Long id) {
        return apiKeyRepository.findById(id)
            .map(apiKey -> {
                apiKey.setEnabled(false);
                apiKey.setLastUsedAt(OffsetDateTime.now());
                return true;
            })
            .orElse(false);
    }

    private String generateUniqueKey(int length) {
        String candidate;
        do {
            candidate = randomString(length);
        } while (apiKeyRepository.findByKey(candidate).isPresent());
        return candidate;
    }

    private String randomString(int length) {
        char[] buffer = new char[length];
        for (int i = 0; i < length; i++) {
            buffer[i] = KEY_ALPHABET[secureRandom.nextInt(KEY_ALPHABET.length)];
        }
        return new String(buffer);
    }
}
