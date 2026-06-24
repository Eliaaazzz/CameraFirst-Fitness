package com.fitnessapp.backend.coach.agent.tools;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fitnessapp.backend.coach.agent.AgentTool;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository.UserMacroAggregate;
import com.fitnessapp.backend.social.repository.FollowRepository;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.repository.UserProfileRepository;

import lombok.RequiredArgsConstructor;

/**
 * Tool (social recommendation): among the people the user follows, find those whose recent eating
 * (average macro profile) is most similar to the user's. Privacy-aware (skips users who opted out of
 * activity sharing). A lightweight, dependency-free form of user-user similarity over the social graph.
 */
@Component
@RequiredArgsConstructor
public class FindFriendsEatingSimilarTool implements AgentTool {

    private static final int MAX_FOLLOWEES_SCANNED = 50;

    private final FollowRepository followRepository;
    private final MealLogRepository mealLogRepository;
    private final UserProfileRepository userProfileRepository;
    private final ObjectMapper objectMapper;

    @Override
    public String name() {
        return "find_friends_eating_similar";
    }

    @Override
    public String description() {
        return "Find people the user follows whose recent eating (average daily calories/protein/carbs/fat) "
                + "is most similar to the user's own. Respects each person's privacy setting. Returns friend "
                + "user ids with a similarity score.";
    }

    @Override
    public JsonNode parametersSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        ObjectNode props = schema.putObject("properties");
        props.putObject("days").put("type", "integer").put("description", "Lookback window in days (default 14)");
        props.putObject("limit").put("type", "integer").put("description", "Max friends to return (default 3)");
        schema.putArray("required");
        return schema;
    }

    @Override
    public JsonNode execute(JsonNode args, UUID userId) {
        int days = clamp(args.path("days").asInt(14), 1, 60);
        int limit = clamp(args.path("limit").asInt(3), 1, 10);
        OffsetDateTime end = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime start = end.minusDays(days);

        ObjectNode out = objectMapper.createObjectNode();
        out.put("days", days);

        List<UUID> followees = followRepository.findFolloweeIds(userId).stream()
                .limit(MAX_FOLLOWEES_SCANNED).toList();

        // Privacy: drop followees who opted out of activity sharing (one batched lookup, no N+1).
        Set<UUID> allowed = new HashSet<>(followees);
        for (UserProfile p : userProfileRepository.findAllById(followees)) {
            if (!p.isShareActivity()) {
                allowed.remove(p.getUserId());
            }
        }
        List<UUID> candidates = followees.stream().filter(allowed::contains).toList();

        // One aggregate query for the user + all candidates (replaces per-followee sum queries).
        List<UUID> ids = new ArrayList<>(candidates.size() + 1);
        ids.add(userId);
        ids.addAll(candidates);
        Map<UUID, double[]> profiles = new HashMap<>();
        for (UserMacroAggregate a : mealLogRepository.aggregateMacrosByUsers(ids, start, end)) {
            profiles.put(a.getUserId(), new double[]{
                    a.getTotalCalories() == null ? 0 : a.getTotalCalories(),
                    a.getTotalProtein() == null ? 0 : a.getTotalProtein().doubleValue(),
                    a.getTotalCarbs() == null ? 0 : a.getTotalCarbs().doubleValue(),
                    a.getTotalFat() == null ? 0 : a.getTotalFat().doubleValue()});
        }

        double[] mine = profiles.get(userId);
        if (mine == null || isZero(mine)) {
            return out.put("message", "Not enough of your own meal history to compare; log a few meals first.");
        }

        List<Friend> friends = new ArrayList<>();
        for (UUID candidate : candidates) {
            double[] theirs = profiles.get(candidate);
            if (theirs == null || isZero(theirs)) {
                continue;
            }
            friends.add(new Friend(candidate, cosine(mine, theirs), theirs));
        }
        friends.sort((a, b) -> Double.compare(b.similarity, a.similarity));

        ArrayNode arr = out.putArray("friends");
        friends.stream().limit(limit).forEach(fr -> {
            ObjectNode n = arr.addObject();
            n.put("userId", fr.userId.toString());
            n.put("similarity", round(fr.similarity));
            ObjectNode profile = n.putObject("avg_daily");
            profile.put("calories", Math.round(fr.profile[0] / days));
            profile.put("protein_g", Math.round(fr.profile[1] / days));
            profile.put("carbs_g", Math.round(fr.profile[2] / days));
            profile.put("fat_g", Math.round(fr.profile[3] / days));
        });
        out.put("count", Math.min(friends.size(), limit));
        return out;
    }

    private static boolean isZero(double[] v) {
        for (double d : v) {
            if (d != 0) {
                return false;
            }
        }
        return true;
    }

    private static double cosine(double[] a, double[] b) {
        double dot = 0;
        double na = 0;
        double nb = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            na += a[i] * a[i];
            nb += b[i] * b[i];
        }
        if (na == 0 || nb == 0) {
            return 0;
        }
        return dot / (Math.sqrt(na) * Math.sqrt(nb));
    }

    private static double round(double v) {
        return Math.round(v * 1000.0) / 1000.0;
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private record Friend(UUID userId, double similarity, double[] profile) {
    }
}
