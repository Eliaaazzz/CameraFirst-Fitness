package com.fitnessapp.backend.social.listener;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.fitnessapp.backend.nutrition.event.MealLoggedEvent;
import com.fitnessapp.backend.social.service.SocialService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Turns a logged meal into a social activity for the user's followers — after the meal transaction
 * commits, so a feed failure can never roll back the meal. Decouples nutrition from the social module.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MealActivityListener {

    private final SocialService socialService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMealLogged(MealLoggedEvent event) {
        try {
            String name = event.recipeName() == null || event.recipeName().isBlank() ? "a meal" : event.recipeName();
            socialService.publishActivity(
                    event.userId(),
                    SocialService.VERB_LOGGED_MEAL,
                    "meal",
                    event.mealId() == null ? null : event.mealId().toString(),
                    "logged " + name);
        } catch (Exception e) {
            log.debug("Meal feed fan-out skipped: {}", e.getMessage());
        }
    }
}
