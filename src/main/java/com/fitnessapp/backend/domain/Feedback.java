package com.fitnessapp.backend.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "feedback")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Feedback {
  @Id
  @Column(columnDefinition = "uuid")
  @GeneratedValue
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id")
  private User user;

  @Column(name = "item_type", nullable = false, length = 20)
  private String itemType;

  @Column(name = "item_id", columnDefinition = "uuid", nullable = false)
  private UUID itemId;

  @Column(nullable = false)
  private Integer rating;

  @Column
  private String notes;

  @Column(name = "created_at", insertable = false, updatable = false)
  private OffsetDateTime createdAt;
}

