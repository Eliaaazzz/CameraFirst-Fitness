package com.fitnessapp.backend.social.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Limit;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.fitnessapp.backend.social.entity.FeedItem;

public interface FeedItemRepository extends JpaRepository<FeedItem, UUID> {

    /** First page of a user's feed (newest first), with id as a stable tiebreaker. */
    List<FeedItem> findByOwnerIdOrderByCreatedAtDescIdDesc(UUID ownerId, Limit limit);

    /**
     * Keyset page using a full (created_at, id) cursor so rows with identical timestamps are never
     * skipped or duplicated across pages.
     */
    @Query("select f from FeedItem f where f.ownerId = :ownerId "
            + "and (f.createdAt < :ts or (f.createdAt = :ts and f.id < :id)) "
            + "order by f.createdAt desc, f.id desc")
    List<FeedItem> findOwnerFeedBefore(@Param("ownerId") UUID ownerId,
                                       @Param("ts") OffsetDateTime ts,
                                       @Param("id") UUID id,
                                       Pageable pageable);
}
