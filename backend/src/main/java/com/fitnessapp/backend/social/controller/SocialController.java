package com.fitnessapp.backend.social.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.fitnessapp.backend.api.common.ApiEnvelope;
import com.fitnessapp.backend.security.AuthenticatedUser;
import com.fitnessapp.backend.social.dto.SocialDtos.FeedPage;
import com.fitnessapp.backend.social.dto.SocialDtos.FollowResponse;
import com.fitnessapp.backend.social.dto.SocialDtos.NotificationsResponse;
import com.fitnessapp.backend.social.dto.SocialDtos.UserRef;
import com.fitnessapp.backend.social.service.SocialService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * Social graph API: follow/unfollow, follower/following lists, a cursor-paginated activity feed,
 * and notifications. All endpoints derive the acting user from the authenticated principal.
 */
@RestController
@RequestMapping(path = "/api/v1/social", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Social", description = "Follow graph, activity feed, and notifications")
public class SocialController {

    private final SocialService socialService;

    @Operation(summary = "Follow a user")
    @PostMapping("/follow/{userId}")
    public ApiEnvelope<FollowResponse> follow(@PathVariable UUID userId,
                                              @AuthenticationPrincipal AuthenticatedUser currentUser) {
        UUID me = require(currentUser);
        if (me.equals(userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot follow yourself");
        }
        return ApiEnvelope.success(socialService.follow(me, userId));
    }

    @Operation(summary = "Unfollow a user")
    @DeleteMapping("/follow/{userId}")
    public ApiEnvelope<FollowResponse> unfollow(@PathVariable UUID userId,
                                                @AuthenticationPrincipal AuthenticatedUser currentUser) {
        return ApiEnvelope.success(socialService.unfollow(require(currentUser), userId));
    }

    @Operation(summary = "List users I follow")
    @GetMapping("/following")
    public ApiEnvelope<List<UserRef>> following(@AuthenticationPrincipal AuthenticatedUser currentUser) {
        return ApiEnvelope.success(socialService.listFollowing(require(currentUser)));
    }

    @Operation(summary = "List my followers")
    @GetMapping("/followers")
    public ApiEnvelope<List<UserRef>> followers(@AuthenticationPrincipal AuthenticatedUser currentUser) {
        return ApiEnvelope.success(socialService.listFollowers(require(currentUser)));
    }

    @Operation(summary = "My activity feed (keyset pagination via 'before' cursor)")
    @GetMapping("/feed")
    public ApiEnvelope<FeedPage> feed(@RequestParam(required = false) String before,
                                      @RequestParam(required = false) Integer limit,
                                      @AuthenticationPrincipal AuthenticatedUser currentUser) {
        return ApiEnvelope.success(socialService.getFeed(require(currentUser), before, limit));
    }

    @Operation(summary = "My notifications + unread count")
    @GetMapping("/notifications")
    public ApiEnvelope<NotificationsResponse> notifications(@RequestParam(required = false) Integer limit,
                                                            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        return ApiEnvelope.success(socialService.getNotifications(require(currentUser), limit));
    }

    @Operation(summary = "Mark all my notifications read")
    @PostMapping("/notifications/read")
    public ApiEnvelope<Map<String, Integer>> markRead(@AuthenticationPrincipal AuthenticatedUser currentUser) {
        return ApiEnvelope.success(Map.of("marked", socialService.markAllNotificationsRead(require(currentUser))));
    }

    private UUID require(AuthenticatedUser user) {
        if (user == null || user.userId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User authentication required");
        }
        return user.userId();
    }
}
