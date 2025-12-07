package com.fitnessapp.backend.user.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "api_key", indexes = {
    @Index(name = "idx_api_key_value", columnList = "key_value")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiKey {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "key_value", nullable = false, unique = true, length = 64)
    private String key;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "tenant_id", length = 64)
    private String tenantId;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "last_used_at")
    private OffsetDateTime lastUsedAt;

    @PrePersist
    void prePersist() {
        createdAt = OffsetDateTime.now();
        if (!enabled) {
            enabled = true;
        }
    }
}

