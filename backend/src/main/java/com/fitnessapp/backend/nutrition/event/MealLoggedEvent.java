package com.fitnessapp.backend.nutrition.event;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Domain event published after a meal is logged; consumed by the social feed fan-out (decoupled). */
public record MealLoggedEvent(UUID userId, Long mealId, String recipeName, OffsetDateTime consumedAt) {
}
