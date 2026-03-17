package com.fitnessapp.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.user.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private UserProfileRepository userProfileRepository;
    @Mock private JwtUtils jwtUtils;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private SocialTokenValidator googleValidator;
    @Mock private AppleTokenValidator appleTokenValidator;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        when(googleValidator.getProvider()).thenReturn(AuthProvider.GOOGLE);
        when(appleTokenValidator.getProvider()).thenReturn(AuthProvider.APPLE);
        authService = new AuthService(userRepository, userProfileRepository, jwtUtils, passwordEncoder,
                List.of(googleValidator, appleTokenValidator), appleTokenValidator);
    }

    @Test
    void loginSocial_existingUser_returnsToken() {
        String idToken = "google-id-token";
        String email = "exists@example.com";
        UUID userId = UUID.randomUUID();

        when(googleValidator.validate(eq(idToken), any()))
                .thenReturn(Optional.of(new SocialUserInfo(email, "Test User")));

        User user = User.builder()
                .id(userId)
                .email(email)
                .authProvider(AuthProvider.GOOGLE)
                .build();
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(jwtUtils.generateToken(userId, email)).thenReturn("jwt-token");

        AuthService.AuthResult result = authService.loginSocial(AuthProvider.GOOGLE, idToken);

        assertNotNull(result);
        assertEquals("jwt-token", result.token());
        assertEquals(email, result.email());
        assertFalse(result.isNewUser());
    }

    @Test
    void loginSocial_newUser_createsAndReturnsToken() {
        String idToken = "google-id-token";
        String email = "new@example.com";
        UUID userId = UUID.randomUUID();

        when(googleValidator.validate(eq(idToken), any()))
                .thenReturn(Optional.of(new SocialUserInfo(email, "New User")));
        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());

        User savedUser = User.builder()
                .id(userId)
                .email(email)
                .authProvider(AuthProvider.GOOGLE)
                .build();
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtUtils.generateToken(userId, email)).thenReturn("jwt-new");

        AuthService.AuthResult result = authService.loginSocial(AuthProvider.GOOGLE, idToken);

        assertNotNull(result);
        assertEquals("jwt-new", result.token());
        assertEquals(email, result.email());
        assertTrue(result.isNewUser());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void loginSocial_newUser_usesProvidedFullNameAsUsername() {
        String idToken = "apple-id-token";
        String email = "apple@privaterelay.appleid.com";
        UUID userId = UUID.randomUUID();

        when(appleTokenValidator.validate(eq(idToken), any()))
                .thenReturn(Optional.of(new SocialUserInfo(email, null, "apple-sub-123")));
        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());

        User savedUser = User.builder()
                .id(userId)
                .email(email)
                .username("Taylor Swift")
                .authProvider(AuthProvider.APPLE)
                .appleUserId("apple-sub-123")
                .build();
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtUtils.generateToken(userId, email)).thenReturn("jwt-apple");

        AuthService.AuthResult result = authService.loginSocial(AuthProvider.APPLE, idToken, "Taylor   Swift");

        assertEquals("jwt-apple", result.token());
        verify(userRepository).save(argThat(user ->
                "Taylor Swift".equals(user.getUsername()) &&
                user.getAuthProvider() == AuthProvider.APPLE));
    }

    @Test
    void loginSocial_apple_exchangesAuthCode() {
        String idToken = "apple-id-token";
        String authCode = "apple-auth-code";
        String email = "apple@privaterelay.appleid.com";
        UUID userId = UUID.randomUUID();

        when(appleTokenValidator.validate(eq(idToken), any()))
                .thenReturn(Optional.of(new SocialUserInfo(email, null, "apple-sub-456")));
        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());

        User savedUser = User.builder()
                .id(userId)
                .email(email)
                .authProvider(AuthProvider.APPLE)
                .appleUserId("apple-sub-456")
                .build();
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtUtils.generateToken(userId, email)).thenReturn("jwt-apple");
        when(appleTokenValidator.exchangeAuthorizationCode(authCode))
                .thenReturn(Optional.of("refresh-token-abc"));

        AuthService.AuthResult result = authService.loginSocial(
                AuthProvider.APPLE, idToken, null, null, authCode);

        assertEquals("jwt-apple", result.token());
        verify(appleTokenValidator).exchangeAuthorizationCode(authCode);
    }

    @Test
    void loginSocial_invalidToken_throwsException() {
        String idToken = "bad-token";
        when(googleValidator.validate(eq(idToken), any())).thenReturn(Optional.empty());

        assertThrows(InvalidTokenException.class, () ->
                authService.loginSocial(AuthProvider.GOOGLE, idToken));
    }

    @Test
    void loginSocial_localProvider_throwsException() {
        assertThrows(UnsupportedProviderException.class, () ->
                authService.loginSocial(AuthProvider.LOCAL, "any-token"));
    }

    @Test
    void loginEmail_validCredentials_returnsToken() {
        String email = "user@example.com";
        String password = "password123";
        String passwordHash = "hashed";
        UUID userId = UUID.randomUUID();

        User user = User.builder()
                .id(userId)
                .email(email)
                .passwordHash(passwordHash)
                .authProvider(AuthProvider.LOCAL)
                .build();
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(password, passwordHash)).thenReturn(true);
        when(jwtUtils.generateToken(userId, email)).thenReturn("jwt-token");

        AuthService.AuthResult result = authService.loginEmail(email, password);

        assertNotNull(result);
        assertEquals("jwt-token", result.token());
        assertEquals(email, result.email());
        assertFalse(result.isNewUser());
    }

    @Test
    void loginEmail_wrongPassword_throwsException() {
        String email = "user@example.com";
        String password = "wrongPassword";

        User user = User.builder()
                .id(UUID.randomUUID())
                .email(email)
                .passwordHash("hashed")
                .authProvider(AuthProvider.LOCAL)
                .build();
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(password, "hashed")).thenReturn(false);

        assertThrows(InvalidCredentialsException.class, () ->
                authService.loginEmail(email, password));
    }

    @Test
    void loginEmail_userNotFound_throwsException() {
        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        assertThrows(InvalidCredentialsException.class, () ->
                authService.loginEmail("unknown@example.com", "password"));
    }

    @Test
    void loginEmail_socialUser_throwsException() {
        String email = "social@example.com";
        User user = User.builder()
                .id(UUID.randomUUID())
                .email(email)
                .authProvider(AuthProvider.GOOGLE)
                .build();
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));

        assertThrows(InvalidCredentialsException.class, () ->
                authService.loginEmail(email, "password"));
    }

    @Test
    void registerEmail_newUser_createsAndReturnsToken() {
        String email = "new@example.com";
        String password = "password123";
        UUID userId = UUID.randomUUID();

        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());
        when(passwordEncoder.encode(password)).thenReturn("encoded-hash");

        User savedUser = User.builder()
                .id(userId)
                .email(email)
                .authProvider(AuthProvider.LOCAL)
                .build();
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtUtils.generateToken(userId, email)).thenReturn("jwt-token");

        AuthService.AuthResult result = authService.registerEmail(email, password);

        assertNotNull(result);
        assertEquals("jwt-token", result.token());
        assertEquals(email, result.email());
        assertTrue(result.isNewUser());
        verify(userRepository).save(argThat(user ->
                user.getEmail().equals(email) &&
                user.getPasswordHash().equals("encoded-hash") &&
                user.getAuthProvider() == AuthProvider.LOCAL));
    }

    @Test
    void registerEmail_existingUser_throwsException() {
        String email = "exists@example.com";
        User existingUser = User.builder().email(email).build();
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(existingUser));

        assertThrows(EmailAlreadyExistsException.class, () ->
                authService.registerEmail(email, "password"));
    }
}
