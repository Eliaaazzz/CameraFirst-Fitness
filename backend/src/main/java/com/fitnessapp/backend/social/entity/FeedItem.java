package com.fitnessapp.backend.social.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** An activity-feed row owned by one user (a follower of the actor); fan-out-on-write. */
@Entity
@Table(name = "activity_feed_items")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedItem {

    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "owner_id", columnDefinition = "uuid", nullable = false)
    private UUID ownerId;

    @Column(name = "actor_id", columnDefinition = "uuid", nullable = false)
    private UUID actorId;

    @Column(name = "verb", length = 32, nullable = false)
    private String verb;

    @Column(name = "object_type", length = 32)
    private String objectType;

    @Column(name = "object_id", length = 64)
    private String objectId;

    @Column(name = "summary", length = 280)
    private String summary;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
