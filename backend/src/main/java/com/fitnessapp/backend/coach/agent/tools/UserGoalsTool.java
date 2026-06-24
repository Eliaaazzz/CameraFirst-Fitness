package com.fitnessapp.backend.coach.agent.tools;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fitnessapp.backend.coach.agent.AgentTool;
import com.fitnessapp.backend.goals.dto.UserGoalResponse;
import com.fitnessapp.backend.goals.service.UserGoalService;

import lombok.RequiredArgsConstructor;

/** Tool: read the authenticated user's active fitness goal + macro targets (wraps {@link UserGoalService}). */
@Component
@RequiredArgsConstructor
public class UserGoalsTool implements AgentTool {

    private final UserGoalService userGoalService;
    private final ObjectMapper objectMapper;

    @Override
    public String name() {
        return "get_user_goals";
    }

    @Override
    public String description() {
        return "Get the current user's active fitness goal and daily targets (calorie range, macro "
                + "grams, sugar/fiber targets). Use this to personalize advice to the user's goals.";
    }

    @Override
    public JsonNode parametersSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        schema.putObject("properties");
        schema.putArray("required");
        return schema;
    }

    @Override
    public JsonNode execute(JsonNode args, UUID userId) {
        Optional<UserGoalResponse> goal = userGoalService.getActiveGoal(userId);
        if (goal.isEmpty()) {
            return objectMapper.createObjectNode()
                    .put("has_active_goal", false)
                    .put("message", "The user has not set an active goal yet.");
        }
        ObjectNode out = (ObjectNode) objectMapper.valueToTree(goal.get());
        out.put("has_active_goal", true);
        return out;
    }
}
