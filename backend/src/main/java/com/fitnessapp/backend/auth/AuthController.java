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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    public static final String JWT_COOKIE_NAME = "aura_jwt";

    private final AuthService authService;

    @Value("${app.jwt.expiration-days:30}")
    private long jwtExpirationDays;

    @Value("${app.cookie.secure:true}")
    private boolean cookieSecure;

    /**
     * Unified login endpoint supporting all authentication methods.
     * For web clients (detected via User-Agent), sets JWT as HttpOnly cookie.
     * For mobile clients, returns JWT in response body only.
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            @RequestHeader(value = "User-Agent", defaultValue = "") String userAgent,
            HttpServletResponse response) {
        AuthService.AuthResult result;

        if (request.isSocialLogin()) {
            result = authService.loginSocial(request.loginType(), request.idToken());
        } else {
            result = authService.loginEmail(request.email(), request.password());
        }

        // Set HttpOnly cookie for web clients
        if (isWebClient(userAgent)) {
            setJwtCookie(response, result.token());
        }

        return ResponseEntity.ok(toResponse(result));
    }

    /**
     * Registration endpoint for email/password users.
     * For web clients, sets JWT as HttpOnly cookie.
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request,
            @RequestHeader(value = "User-Agent", defaultValue = "") String userAgent,
            HttpServletResponse response) {
        AuthService.AuthResult result = authService.registerEmail(
                request.email(), request.password());

        // Set HttpOnly cookie for web clients
        if (isWebClient(userAgent)) {
            setJwtCookie(response, result.token());
        }

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
            @RequestHeader(value = "User-Agent", defaultValue = "") String userAgent,
            HttpServletResponse response) {
        AuthService.AuthResult result = authService.loginSocial(
                AuthProvider.GOOGLE, request.idToken());

        if (isWebClient(userAgent)) {
            setJwtCookie(response, result.token());
        }

        return ResponseEntity.ok(toResponse(result));
    }

    /**
     * Apple login endpoint for convenience.
     */
    @PostMapping("/apple")
    public ResponseEntity<AuthResponse> appleLogin(
            @RequestBody AppleLoginRequest request,
            @RequestHeader(value = "User-Agent", defaultValue = "") String userAgent,
            HttpServletResponse response) {
        AuthService.AuthResult result = authService.loginSocial(
                AuthProvider.APPLE, request.idToken());

        if (isWebClient(userAgent)) {
            setJwtCookie(response, result.token());
        }

        return ResponseEntity.ok(toResponse(result));
    }

    /**
     * Logout endpoint - clears the HttpOnly JWT cookie.
     * Mobile clients should clear their local storage separately.
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        // Clear the JWT cookie by setting maxAge to 0
        ResponseCookie cookie = ResponseCookie.from(JWT_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
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
        ResponseCookie cookie = ResponseCookie.from(JWT_COOKIE_NAME, token)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/")
                .maxAge(jwtExpirationDays * 24 * 60 * 60) // Convert days to seconds
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    /**
     * Detect if the request is from a web browser.
     * Mobile apps (React Native) typically don't send standard browser User-Agent strings.
     */
    private boolean isWebClient(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return false;
        }
        String ua = userAgent.toLowerCase();
        // Common browser indicators
        return ua.contains("mozilla") || ua.contains("chrome") || ua.contains("safari")
                || ua.contains("firefox") || ua.contains("edge") || ua.contains("opera");
    }

    // Legacy DTO for backwards compatibility
    public record GoogleLoginRequest(String idToken) {}

    public record AppleLoginRequest(String idToken) {}
}
