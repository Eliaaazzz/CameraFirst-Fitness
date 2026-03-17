package com.fitnessapp.backend.auth;

import com.auth0.jwt.interfaces.DecodedJWT;
import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.repository.UserRepository;
import com.fitnessapp.backend.user.service.UserService;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Handles Apple's server-to-server notifications for Sign in with Apple.
 *
 * Apple sends notifications when users:
 * - Change email forwarding preferences (email-enabled / email-disabled)
 * - Revoke consent for the app (consent-revoked)
 * - Permanently delete their Apple Account (account-deleted)
 *
 * This endpoint must be registered in Apple Developer Account under
 * Certificates, Identifiers & Profiles > Server-to-Server Notifications.
 */
@RestController
@RequestMapping("/api/v1/auth/apple")
@RequiredArgsConstructor
@Slf4j
public class AppleNotificationController {

    private final AppleTokenValidator appleTokenValidator;
    private final UserRepository userRepository;
    private final UserService userService;

    @PostMapping("/notifications")
    public ResponseEntity<Void> handleNotification(@RequestBody Map<String, String> body) {
        String payload = body.get("payload");
        if (payload == null || payload.isBlank()) {
            log.warn("Apple notification received with empty payload");
            return ResponseEntity.badRequest().build();
        }

        // Verify the JWS signature using Apple's public keys
        Optional<DecodedJWT> verified = appleTokenValidator.verifyAppleJws(payload);
        if (verified.isEmpty()) {
            log.warn("Apple notification JWS verification failed");
            return ResponseEntity.badRequest().build();
        }

        DecodedJWT jwt = verified.get();

        // Extract events claim
        Map<String, Object> events = jwt.getClaim("events").asMap();
        if (events == null) {
            log.warn("Apple notification missing events claim");
            return ResponseEntity.badRequest().build();
        }

        String eventType = (String) events.get("type");
        String sub = (String) events.get("sub");

        if (eventType == null || sub == null) {
            log.warn("Apple notification missing type or sub in events");
            return ResponseEntity.badRequest().build();
        }

        log.info("Apple notification received: type={}, sub={}", eventType, maskSub(sub));

        switch (eventType) {
            case "consent-revoked" -> handleConsentRevoked(sub);
            case "account-deleted" -> handleAccountDeleted(sub);
            case "email-enabled" -> handleEmailEnabled(sub, events);
            case "email-disabled" -> handleEmailDisabled(sub, events);
            default -> log.info("Unhandled Apple notification type: {}", eventType);
        }

        return ResponseEntity.ok().build();
    }

    private void handleConsentRevoked(String appleUserId) {
        Optional<User> user = userRepository.findByAppleUserId(appleUserId);
        if (user.isEmpty()) {
            log.info("Consent revoked for unknown Apple user: {}", maskSub(appleUserId));
            return;
        }

        User u = user.get();
        log.info("Apple consent revoked for user: {}", u.getEmail());

        // Clear Apple-specific fields - user can no longer sign in via Apple
        u.setAppleRefreshToken(null);
        userRepository.save(u);
    }

    private void handleAccountDeleted(String appleUserId) {
        Optional<User> user = userRepository.findByAppleUserId(appleUserId);
        if (user.isEmpty()) {
            log.info("Account deleted for unknown Apple user: {}", maskSub(appleUserId));
            return;
        }

        User u = user.get();
        log.info("Apple account deleted, removing user: {}", u.getEmail());

        // Delete the user and all associated data
        userService.deleteUser(u.getId());
    }

    private void handleEmailEnabled(String appleUserId, Map<String, Object> events) {
        String email = (String) events.get("email");
        log.info("Email forwarding enabled for Apple user: {}, email: {}",
                maskSub(appleUserId), email != null ? "provided" : "not provided");
        // No action needed - emails to the relay address will now be forwarded
    }

    private void handleEmailDisabled(String appleUserId, Map<String, Object> events) {
        String email = (String) events.get("email");
        log.info("Email forwarding disabled for Apple user: {}, email: {}",
                maskSub(appleUserId), email != null ? "provided" : "not provided");
        // Log for awareness - app should avoid sending emails to this address
    }

    private static String maskSub(String sub) {
        if (sub == null || sub.length() <= 8) {
            return "***";
        }
        return sub.substring(0, 4) + "..." + sub.substring(sub.length() - 4);
    }
}
