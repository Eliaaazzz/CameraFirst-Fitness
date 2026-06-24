package com.fitnessapp.backend.social.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;

import com.fitnessapp.backend.social.entity.FeedItem;

public interface FeedItemRepository extends JpaRepository<FeedItem, UUID> {

    /** First page of a user's feed (newest first). */
    List<FeedItem> findByOwnerIdOrderByCreatedAtDesc(UUID ownerId, Limit limit);

    /** Keyset page: items older than the cursor timestamp (newest first). */
    List<FeedItem> findByOwnerIdAndCreatedAtLessThanOrderByCreatedAtDesc(
            UUID ownerId, OffsetDateTime before, Limit limit);
}
