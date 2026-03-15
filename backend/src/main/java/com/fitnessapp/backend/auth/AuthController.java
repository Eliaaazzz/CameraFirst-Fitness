package com.fitnessapp.backend.auth;

import com.fitnessapp.backend.auth.dto.AuthResponse;
import com.fitnessapp.backend.auth.dto.LoginRequest;
import com.fitnessapp.backend.auth.dto.RegisterRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    public static final String JWT_COOKIE_NAME = "__session";

    private final AuthService authService;

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
            result = authService.loginSocial(request.loginType(), request.idToken(), request.fullName());
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
        return new AuthResponse(result.token(), result.email(), result.isNewUser());
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
