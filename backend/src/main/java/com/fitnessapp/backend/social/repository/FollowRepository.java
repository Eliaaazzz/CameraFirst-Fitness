package com.fitnessapp.backend.social.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.fitnessapp.backend.social.entity.Follow;

public interface FollowRepository extends JpaRepository<Follow, UUID> {

    boolean existsByFollowerIdAndFolloweeId(UUID followerId, UUID followeeId);

    /**
     * Idempotent, race-free follow insert: returns 1 if a new edge was created, 0 if it already
     * existed (relies on the unique (follower_id, followee_id) constraint). Avoids the
     * check-then-insert race that could 500 or emit phantom notifications under concurrency.
     */
    @Modifying
    @Query(value = "INSERT INTO follows (id, follower_id, followee_id, created_at) "
            + "VALUES (:id, :followerId, :followeeId, now()) "
            + "ON CONFLICT (follower_id, followee_id) DO NOTHING", nativeQuery = true)
    int insertIgnoreConflict(@Param("id") UUID id,
                             @Param("followerId") UUID followerId,
                             @Param("followeeId") UUID followeeId);

    void deleteByFollowerIdAndFolloweeId(UUID followerId, UUID followeeId);

    List<Follow> findByFollowerIdOrderByCreatedAtDesc(UUID followerId);

    List<Follow> findByFolloweeIdOrderByCreatedAtDesc(UUID followeeId);

    long countByFollowerId(UUID followerId);

    long countByFolloweeId(UUID followeeId);

    @Query("select f.followeeId from Follow f where f.followerId = :userId")
    List<UUID> findFolloweeIds(@Param("userId") UUID userId);

    @Query("select f.followerId from Follow f where f.followeeId = :userId")
    List<UUID> findFollowerIds(@Param("userId") UUID userId);
}
