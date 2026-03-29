package com.fitnessapp.backend.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.auth.dto.AuthResponse;
import com.fitnessapp.backend.auth.dto.LoginRequest;
import com.fitnessapp.backend.auth.dto.RegisterRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    public static final String JWT_COOKIE_NAME = "__session";

    private final AuthService authService;
    private final ObjectMapper objectMapper;

    @Value("${app.jwt.expiration-days:30}")
    private long jwtExpirationDays;

    @Value("${app.cookie.secure:true}")
    private boolean cookieSecure;

    @Value("${app.cookie.same-site:Strict}")
    private String cookieSameSite;

    @Value("${app.cookie.domain:}")
    private String cookieDomain;

    @Value("${app.google.client-id:}")
    private String googleClientId;

    @Value("${app.apple.web-redirect-uri:}")
    private String appleWebRedirectUri;

    /**
     * Exposes Google OAuth client ID for web clients that fetch config dynamically.
     */
    @GetMapping("/google/client-id")
    public ResponseEntity<Map<String, String>> getGoogleClientId() {
        return ResponseEntity.ok(Map.of("clientId", googleClientId != null ? googleClientId : ""));
    }

    /**
     * Unified login endpoint supporting all authentication methods.
     * For web clients (detected via User-Agent), sets JWT as HttpOnly cookie.
     * For mobile clients, returns JWT in response body only.
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {
        AuthService.AuthResult result;

        if (request.isSocialLogin()) {
            result = authService.loginSocial(request.loginType(), request.idToken(), request.fullName(), request.nonce(), request.authorizationCode());
        } else {
            result = authService.loginEmail(request.email(), request.password());
        }

        // Always set HttpOnly cookie to keep web session restoration reliable.
        setJwtCookie(response, result.token());

        return ResponseEntity.ok(toResponse(result));
    }

    /**
     * Registration endpoint for email/password users.
     * For web clients, sets JWT as HttpOnly cookie.
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletResponse response) {
        AuthService.AuthResult result = authService.registerEmail(
                request.email(), request.password());

        setJwtCookie(response, result.token());

        return ResponseEntity.ok(toResponse(result));
    }

    /**
     * Google login endpoint (backwards compatibility).
     * @deprecated Use /api/v1/auth/login with loginType=GOOGLE instead.
     */
    @PostMapping("/google")
    @Deprecated
    public ResponseEntity<AuthResponse> googleLogin(
            @RequestBody GoogleLoginRequest request,
            HttpServletResponse response) {
        AuthService.AuthResult result = authService.loginSocial(
                AuthProvider.GOOGLE, request.idToken());

        setJwtCookie(response, result.token());

        return ResponseEntity.ok(toResponse(result));
    }

    /**
     * Apple login endpoint for convenience.
     */
    @PostMapping("/apple")
    public ResponseEntity<AuthResponse> appleLogin(
            @RequestBody AppleLoginRequest request,
            HttpServletResponse response) {
        AuthService.AuthResult result = authService.loginSocial(
                AuthProvider.APPLE, request.idToken(), request.fullName());

        setJwtCookie(response, result.token());

        return ResponseEntity.ok(toResponse(result));
    }

    /**
     * Apple Sign In backend callback endpoint.
     *
     * Apple POSTs form data here after the user authenticates (server-redirect flow).
     * The backend validates the id_token, exchanges the authorization code,
     * sets the JWT as an HttpOnly cookie, and redirects to the frontend.
     *
     * Register this URL as the Return URL in your Apple Services ID configuration:
     *   https://your-api-domain/api/v1/auth/apple/callback
     */
    @PostMapping(value = "/apple/callback", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<Void> appleCallback(
            @RequestParam("id_token") String idToken,
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "user", required = false) String userJson,
            HttpServletResponse response) {

        // Extract full name from Apple's user JSON (only sent on first sign-in)
        String fullName = null;
        if (userJson != null && !userJson.isBlank()) {
            try {
                var userNode = objectMapper.readTree(userJson);
                var nameNode = userNode.get("name");
                if (nameNode != null) {
                    String first = nameNode.has("firstName") ? nameNode.get("firstName").asText("") : "";
                    String last = nameNode.has("lastName") ? nameNode.get("lastName").asText("") : "";
                    String combined = (first + " " + last).trim();
                    if (!combined.isBlank()) {
                        fullName = combined;
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to parse Apple user JSON: {}", e.getMessage());
            }
        }

        try {
            AuthService.AuthResult result = authService.loginSocial(
                    AuthProvider.APPLE, idToken, fullName, null, code);

            setJwtCookie(response, result.token());

            // Redirect to frontend
            String redirectTarget = resolveAppleRedirectTarget();
            return ResponseEntity.status(302)
                    .location(URI.create(redirectTarget))
                    .build();

        } catch (Exception e) {
            log.error("Apple callback authentication failed: {}", e.getMessage());
            String redirectTarget = resolveAppleRedirectTarget();
            String errorRedirect = redirectTarget + "?error=" +
                    URLEncoder.encode("Apple sign-in failed", StandardCharsets.UTF_8);
            return ResponseEntity.status(302)
                    .location(URI.create(errorRedirect))
                    .build();
        }
    }

    private String resolveAppleRedirectTarget() {
        if (appleWebRedirectUri != null && !appleWebRedirectUri.isBlank()) {
            return appleWebRedirectUri;
        }
        return "https://aurafitness.org";
    }

    /**
     * Logout endpoint - clears the HttpOnly JWT cookie.
     * Mobile clients should clear their local storage separately.
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        // Clear the JWT cookie by setting maxAge to 0
        ResponseCookie.ResponseCookieBuilder cookieBuilder = ResponseCookie.from(JWT_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/")
                .maxAge(0);

        if (cookieDomain != null && !cookieDomain.isBlank()) {
            cookieBuilder = cookieBuilder.domain(cookieDomain);
        }

        response.addHeader(HttpHeaders.SET_COOKIE, cookieBuilder.build().toString());
        return ResponseEntity.ok().build();
    }

    private AuthResponse toResponse(AuthService.AuthResult result) {
        var snapshot = new AuthResponse.UserSnapshot(
                result.userId(),
                result.username() != null && !result.username().isBlank()
                        ? result.username()
                        : result.email().split("@")[0],
                result.currentStreak(),
                result.level(),
                result.timeBucket()
        );
        return new AuthResponse(result.token(), result.email(), result.isNewUser(), snapshot);
    }

    /**
     * Sets JWT as HttpOnly cookie for web clients.
     * This prevents XSS attacks from stealing the token.
     */
    private void setJwtCookie(HttpServletResponse response, String token) {
        ResponseCookie.ResponseCookieBuilder cookieBuilder = ResponseCookie.from(JWT_COOKIE_NAME, token)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/")
                .maxAge(jwtExpirationDays * 24 * 60 * 60); // Convert days to seconds

        if (cookieDomain != null && !cookieDomain.isBlank()) {
            cookieBuilder = cookieBuilder.domain(cookieDomain);
        }

        response.addHeader(HttpHeaders.SET_COOKIE, cookieBuilder.build().toString());
    }

    // Legacy DTO for backwards compatibility
    public record GoogleLoginRequest(String idToken) {}

    public record AppleLoginRequest(String idToken, String fullName) {}
}
