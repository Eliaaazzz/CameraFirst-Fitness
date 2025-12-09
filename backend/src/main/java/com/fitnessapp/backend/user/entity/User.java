package com.fitnessapp.backend.user.entity;

import com.fitnessapp.backend.auth.AuthProvider;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
  @Id
  @Column(columnDefinition = "uuid")
  @GeneratedValue
  private UUID id;

  @Column(nullable = false, unique = true, length = 255)
  private String email;

  @Column(name = "password_hash", length = 255)
  private String passwordHash;

  @Enumerated(EnumType.STRING)
  @Column(name = "auth_provider", length = 20)
  @Builder.Default
  private AuthProvider authProvider = AuthProvider.LOCAL;

  @Column(name = "time_bucket", nullable = false)
  private Integer timeBucket;

  @Column(nullable = false, length = 20)
  private String level;

  @Column(name = "diet_tilt", length = 50)
  private String dietTilt;

  @Column(name = "created_at", insertable = false, updatable = false)
  private OffsetDateTime createdAt;
}

