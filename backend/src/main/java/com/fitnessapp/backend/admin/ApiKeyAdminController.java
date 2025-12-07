package com.fitnessapp.backend.admin;

import com.fitnessapp.backend.domain.ApiKey;
import com.fitnessapp.backend.service.ApiKeyService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/api-keys")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ApiKeyAdminController {

    private final ApiKeyService apiKeyService;

    @PostMapping
    public ResponseEntity<ApiKeyResponse> create(@Valid @RequestBody CreateApiKeyRequest request) {
        ApiKey apiKey = apiKeyService.createKey(request.name(), request.tenantId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiKeyResponse.from(apiKey));
    }

    @GetMapping
    public List<ApiKeySummary> listKeys() {
        return apiKeyService.listKeys().stream()
            .map(ApiKeySummary::from)
            .collect(Collectors.toList());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> revoke(@PathVariable Long id) {
        boolean revoked = apiKeyService.revokeKey(id);
        return revoked ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    public record CreateApiKeyRequest(@NotBlank String name, String tenantId) {}

    public record ApiKeyResponse(Long id, String key, String name, String tenantId, boolean enabled,
                                 OffsetDateTime createdAt, OffsetDateTime lastUsedAt) {
        static ApiKeyResponse from(ApiKey apiKey) {
            return new ApiKeyResponse(apiKey.getId(), apiKey.getKey(), apiKey.getName(), apiKey.getTenantId(),
                apiKey.isEnabled(), apiKey.getCreatedAt(), apiKey.getLastUsedAt());
        }
    }

    public record ApiKeySummary(Long id, String name, String tenantId, boolean enabled,
                                OffsetDateTime createdAt, OffsetDateTime lastUsedAt) {
        static ApiKeySummary from(ApiKey apiKey) {
            return new ApiKeySummary(apiKey.getId(), apiKey.getName(), apiKey.getTenantId(), apiKey.isEnabled(),
                apiKey.getCreatedAt(), apiKey.getLastUsedAt());
        }
    }
}

