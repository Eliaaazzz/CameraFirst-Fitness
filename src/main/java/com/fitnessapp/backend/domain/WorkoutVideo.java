package com.fitnessapp.backend.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "workout_video")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkoutVideo {
  @Id
  @Column(columnDefinition = "uuid")
  @GeneratedValue
  private UUID id;

  @Column(name = "youtube_id", nullable = false, unique = true, length = 20)
  private String youtubeId;

  @Column(nullable = false, length = 255)
  private String title;

  @Column(name = "duration_minutes", nullable = false)
  private Integer durationMinutes;

  @Column(nullable = false, length = 20)
  private String level;

  @Column
  @JdbcTypeCode(SqlTypes.ARRAY)
  private List<String> equipment;

  @Column(name = "body_part")
  @JdbcTypeCode(SqlTypes.ARRAY)
  private List<String> bodyPart;

  @Column(name = "thumbnail_url")
  private String thumbnailUrl;

  @Column(name = "channel_id", length = 50)
  private String channelId;

  @Column(name = "channel_title")
  private String channelTitle;

  @Column(name = "channel_subscriber_count")
  private Long channelSubscriberCount;

  @Column(name = "view_count", nullable = false)
  private Long viewCount;

  @Column(name = "last_validated_at")
  private OffsetDateTime lastValidatedAt;

  @Column(name = "created_at", insertable = false, updatable = false)
  private OffsetDateTime createdAt;
}
