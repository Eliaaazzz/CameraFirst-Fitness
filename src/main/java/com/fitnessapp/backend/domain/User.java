package com.fitnessapp.backend.domain;

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

  @Column(name = "time_bucket", nullable = false)
  private Integer timeBucket;

  @Column(nullable = false, length = 20)
  private String level;

  @Column(name = "diet_tilt", length = 50)
  private String dietTilt;

  @Column(name = "created_at", insertable = false, updatable = false)
  private OffsetDateTime createdAt;
}

