package com.fitnessapp.backend.social.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.fitnessapp.backend.social.entity.Follow;

public interface FollowRepository extends JpaRepository<Follow, UUID> {

    boolean existsByFollowerIdAndFolloweeId(UUID followerId, UUID followeeId);

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
