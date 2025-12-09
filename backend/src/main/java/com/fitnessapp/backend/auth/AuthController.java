package com.fitnessapp.backend.auth;

import com.fitnessapp.backend.auth.dto.AuthResponse;
import com.fitnessapp.backend.auth.dto.LoginRequest;
import com.fitnessapp.backend.auth.dto.RegisterRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * Unified login endpoint supporting all authentication methods.
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthService.AuthResult result;

        if (request.isSocialLogin()) {
            result = authService.loginSocial(request.loginType(), request.idToken());
        } else {
            result = authService.loginEmail(request.email(), request.password());
        }

        return ResponseEntity.ok(toResponse(result));
    }

    /**
     * Registration endpoint for email/password users.
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthService.AuthResult result = authService.registerEmail(
                request.email(), request.password());
        return ResponseEntity.ok(toResponse(result));
    }

    /**
     * Google login endpoint (backwards compatibility).
     * @deprecated Use /api/v1/auth/login with loginType=GOOGLE instead.
     */
    @PostMapping("/google")
    @Deprecated
    public ResponseEntity<AuthResponse> googleLogin(@RequestBody GoogleLoginRequest request) {
        AuthService.AuthResult result = authService.loginSocial(
                AuthProvider.GOOGLE, request.idToken());
        return ResponseEntity.ok(toResponse(result));
    }

    /**
     * Apple login endpoint for convenience.
     */
    @PostMapping("/apple")
    public ResponseEntity<AuthResponse> appleLogin(@RequestBody AppleLoginRequest request) {
        AuthService.AuthResult result = authService.loginSocial(
                AuthProvider.APPLE, request.idToken());
        return ResponseEntity.ok(toResponse(result));
    }

    private AuthResponse toResponse(AuthService.AuthResult result) {
        return new AuthResponse(result.token(), result.email(), result.isNewUser());
    }

    // Legacy DTO for backwards compatibility
    public record GoogleLoginRequest(String idToken) {}

    public record AppleLoginRequest(String idToken) {}
}
