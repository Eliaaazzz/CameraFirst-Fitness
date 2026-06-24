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

/** A directed follow edge: {@code follower} follows {@code followee}. */
@Entity
@Table(name = "follows")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Follow {

    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "follower_id", columnDefinition = "uuid", nullable = false)
    private UUID followerId;

    @Column(name = "followee_id", columnDefinition = "uuid", nullable = false)
    private UUID followeeId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
