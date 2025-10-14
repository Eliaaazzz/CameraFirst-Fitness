package com.fitnessapp.backend.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "image_query")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImageQuery {
  @Id
  @Column(columnDefinition = "uuid")
  @GeneratedValue
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id")
  private User user;

  @Column(nullable = false, length = 50)
  private String type;

  @Column(name = "detected_hints", columnDefinition = "jsonb", nullable = false)
  private String detectedHints;

  @Column(name = "created_at", insertable = false, updatable = false)
  private OffsetDateTime createdAt;
}

