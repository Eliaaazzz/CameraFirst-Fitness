package com.fitnessapp.backend.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "retrieval_result")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RetrievalResult {
  @Id
  @Column(columnDefinition = "uuid")
  @GeneratedValue
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "query_id", nullable = false)
  private ImageQuery query;

  @Column(name = "item_type", nullable = false, length = 50)
  private String itemType;

  @Column(name = "item_id", columnDefinition = "uuid", nullable = false)
  private UUID itemId;

  @Column(nullable = false)
  private Integer rank;

  @Column(precision = 6, scale = 3)
  private java.math.BigDecimal score;

  @Column(name = "latency_ms")
  private Integer latencyMs;

  @Column(name = "created_at", insertable = false, updatable = false)
  private OffsetDateTime createdAt;
}

