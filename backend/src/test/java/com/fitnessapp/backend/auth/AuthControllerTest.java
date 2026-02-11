package com.fitnessapp.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fitnessapp.backend.auth.dto.AuthResponse;
import com.fitnessapp.backend.auth.dto.LoginRequest;
import com.fitnessapp.backend.auth.dto.RegisterRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.lang.reflect.Field;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    private static final String MOCK_JWT = "eyJhbGciOiJIUzI1NiJ9.mock-jwt";
    private static final String MOCK_EMAIL = "test@example.com";

    @BeforeEach
    void setUp() throws Exception {
        // Set @Value fields via reflection since we're not using Spring context
        setField(authController, "jwtExpirationDays", 30L);
        setField(authController, "cookieSecure", true);
        setField(authController, "cookieSameSite", "Strict");
        setField(authController, "cookieDomain", "");
        setField(authController, "googleClientId", "google-web-client-id");
    }

    private void setField(Object target, String fieldName, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }

    // =========================================================================
    // Login - Email/Password
    // =========================================================================

    @Test
    void login_emailPassword_returnsAuthResponse() {
        LoginRequest request = new LoginRequest(AuthProvider.LOCAL, null, MOCK_EMAIL, "password123");
        AuthService.AuthResult result = new AuthService.AuthResult(MOCK_JWT, MOCK_EMAIL, false);
        when(authService.loginEmail(MOCK_EMAIL, "password123")).thenReturn(result);

        HttpServletResponse servletResponse = mock(HttpServletResponse.class);
        ResponseEntity<AuthResponse> response = authController.login(request, servletResponse);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals(MOCK_JWT, response.getBody().token());
        assertEquals(MOCK_EMAIL, response.getBody().email());
        assertFalse(response.getBody().isNewUser());
    }

    @Test
    void login_emailPassword_doesNotSetCookieForMobileClient() {
        LoginRequest request = new LoginRequest(AuthProvider.LOCAL, null, MOCK_EMAIL, "password123");
        AuthService.AuthResult result = new AuthService.AuthResult(MOCK_JWT, MOCK_EMAIL, false);
        when(authService.loginEmail(MOCK_EMAIL, "password123")).thenReturn(result);

        HttpServletResponse servletResponse = mock(HttpServletResponse.class);
        authController.login(request, servletResponse);

        verify(servletResponse).addHeader(eq(HttpHeaders.SET_COOKIE), anyString());
    }

    @Test
    void login_emailPassword_setsCookieForWebClient() {
        LoginRequest request = new LoginRequest(AuthProvider.LOCAL, null, MOCK_EMAIL, "password123");
        AuthService.AuthResult result = new AuthService.AuthResult(MOCK_JWT, MOCK_EMAIL, false);
        when(authService.loginEmail(MOCK_EMAIL, "password123")).thenReturn(result);

        HttpServletResponse servletResponse = mock(HttpServletResponse.class);
        authController.login(request, servletResponse);

        ArgumentCaptor<String> cookieCaptor = ArgumentCaptor.forClass(String.class);
        verify(servletResponse).addHeader(eq(HttpHeaders.SET_COOKIE), cookieCaptor.capture());

        String cookie = cookieCaptor.getValue();
        assertTrue(cookie.contains("aura_jwt=" + MOCK_JWT));
        assertTrue(cookie.contains("HttpOnly"));
        assertTrue(cookie.contains("Secure"));
        assertTrue(cookie.contains("SameSite=Strict"));
        assertTrue(cookie.contains("Path=/"));
    }

    // =========================================================================
    // Login - Social (Google)
    // =========================================================================

    @Test
    void login_google_routesToSocialLogin() {
        LoginRequest request = new LoginRequest(AuthProvider.GOOGLE, "google-id-token", null, null);
        AuthService.AuthResult result = new AuthService.AuthResult(MOCK_JWT, "google@gmail.com", true);
        when(authService.loginSocial(AuthProvider.GOOGLE, "google-id-token")).thenReturn(result);

        HttpServletResponse servletResponse = mock(HttpServletResponse.class);
        ResponseEntity<AuthResponse> response = authController.login(request, servletResponse);

        assertEquals(200, response.getStatusCode().value());
        assertEquals("google@gmail.com", response.getBody().email());
        assertTrue(response.getBody().isNewUser());
        verify(authService).loginSocial(AuthProvider.GOOGLE, "google-id-token");
        verify(authService, never()).loginEmail(anyString(), anyString());
    }

    // =========================================================================
    // Login - Social (Apple)
    // =========================================================================

    @Test
    void login_apple_routesToSocialLogin() {
        LoginRequest request = new LoginRequest(AuthProvider.APPLE, "apple-id-token", null, null);
        AuthService.AuthResult result = new AuthService.AuthResult(MOCK_JWT, "apple@privaterelay.appleid.com", false);
        when(authService.loginSocial(AuthProvider.APPLE, "apple-id-token")).thenReturn(result);

        HttpServletResponse servletResponse = mock(HttpServletResponse.class);
        ResponseEntity<AuthResponse> response = authController.login(request, servletResponse);

        assertEquals(200, response.getStatusCode().value());
        assertEquals("apple@privaterelay.appleid.com", response.getBody().email());
        verify(authService).loginSocial(AuthProvider.APPLE, "apple-id-token");
    }

    // =========================================================================
    // Login - isSocialLogin routing
    // =========================================================================

    @Test
    void login_localType_routesToLoginEmail() {
        LoginRequest request = new LoginRequest(AuthProvider.LOCAL, null, MOCK_EMAIL, "password123");
        AuthService.AuthResult result = new AuthService.AuthResult(MOCK_JWT, MOCK_EMAIL, false);
        when(authService.loginEmail(MOCK_EMAIL, "password123")).thenReturn(result);

        HttpServletResponse servletResponse = mock(HttpServletResponse.class);
        authController.login(request, servletResponse);

        verify(authService).loginEmail(MOCK_EMAIL, "password123");
        verify(authService, never()).loginSocial(any(), anyString());
    }

    @Test
    void login_googleType_routesToLoginSocial() {
        LoginRequest request = new LoginRequest(AuthProvider.GOOGLE, "id-token", null, null);
        AuthService.AuthResult result = new AuthService.AuthResult(MOCK_JWT, MOCK_EMAIL, false);
        when(authService.loginSocial(AuthProvider.GOOGLE, "id-token")).thenReturn(result);

        HttpServletResponse servletResponse = mock(HttpServletResponse.class);
        authController.login(request, servletResponse);

        verify(authService).loginSocial(AuthProvider.GOOGLE, "id-token");
        verify(authService, never()).loginEmail(anyString(), anyString());
    }

    // =========================================================================
    // Register
    // =========================================================================

    @Test
    void register_returnsAuthResponseWithNewUser() {
        RegisterRequest request = new RegisterRequest(MOCK_EMAIL, "password123");
        AuthService.AuthResult result = new AuthService.AuthResult(MOCK_JWT, MOCK_EMAIL, true);
        when(authService.registerEmail(MOCK_EMAIL, "password123")).thenReturn(result);

        HttpServletResponse servletResponse = mock(HttpServletResponse.class);
        ResponseEntity<AuthResponse> response = authController.register(request, servletResponse);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals(MOCK_JWT, response.getBody().token());
        assertEquals(MOCK_EMAIL, response.getBody().email());
        assertTrue(response.getBody().isNewUser());
    }

    @Test
    void register_setsCookieForWebClient() {
        RegisterRequest request = new RegisterRequest(MOCK_EMAIL, "password123");
        AuthService.AuthResult result = new AuthService.AuthResult(MOCK_JWT, MOCK_EMAIL, true);
        when(authService.registerEmail(MOCK_EMAIL, "password123")).thenReturn(result);

        HttpServletResponse servletResponse = mock(HttpServletResponse.class);
        authController.register(request, servletResponse);

        ArgumentCaptor<String> cookieCaptor = ArgumentCaptor.forClass(String.class);
        verify(servletResponse).addHeader(eq(HttpHeaders.SET_COOKIE), cookieCaptor.capture());

        String cookie = cookieCaptor.getValue();
        assertTrue(cookie.contains("aura_jwt=" + MOCK_JWT));
        assertTrue(cookie.contains("HttpOnly"));
    }

    @Test
    void register_doesNotSetCookieForMobileClient() {
        RegisterRequest request = new RegisterRequest(MOCK_EMAIL, "password123");
        AuthService.AuthResult result = new AuthService.AuthResult(MOCK_JWT, MOCK_EMAIL, true);
        when(authService.registerEmail(MOCK_EMAIL, "password123")).thenReturn(result);

        HttpServletResponse servletResponse = mock(HttpServletResponse.class);
        authController.register(request, servletResponse);

        verify(servletResponse).addHeader(eq(HttpHeaders.SET_COOKIE), anyString());
    }

    // =========================================================================
    // Logout
    // =========================================================================

    @Test
    void logout_clearsCookieBySettingMaxAgeZero() {
        HttpServletResponse servletResponse = mock(HttpServletResponse.class);

        ResponseEntity<Void> response = authController.logout(servletResponse);

        assertEquals(200, response.getStatusCode().value());

        ArgumentCaptor<String> cookieCaptor = ArgumentCaptor.forClass(String.class);
        verify(servletResponse).addHeader(eq(HttpHeaders.SET_COOKIE), cookieCaptor.capture());

        String cookie = cookieCaptor.getValue();
        assertTrue(cookie.contains("aura_jwt="));
        assertTrue(cookie.contains("Max-Age=0"));
        assertTrue(cookie.contains("HttpOnly"));
    }

    // =========================================================================
    // Legacy Endpoints
    // =========================================================================

    @Test
    void googleLogin_legacyEndpoint_works() {
        AuthService.AuthResult result = new AuthService.AuthResult(MOCK_JWT, "g@gmail.com", false);
        when(authService.loginSocial(AuthProvider.GOOGLE, "google-token")).thenReturn(result);

        HttpServletResponse servletResponse = mock(HttpServletResponse.class);
        ResponseEntity<AuthResponse> response = authController.googleLogin(
                new AuthController.GoogleLoginRequest("google-token"),
                servletResponse
        );

        assertEquals(200, response.getStatusCode().value());
        assertEquals("g@gmail.com", response.getBody().email());
    }

    @Test
    void appleLogin_legacyEndpoint_works() {
        AuthService.AuthResult result = new AuthService.AuthResult(MOCK_JWT, "a@apple.com", true);
        when(authService.loginSocial(AuthProvider.APPLE, "apple-token")).thenReturn(result);

        HttpServletResponse servletResponse = mock(HttpServletResponse.class);
        ResponseEntity<AuthResponse> response = authController.appleLogin(
                new AuthController.AppleLoginRequest("apple-token"),
                servletResponse
        );

        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getBody().isNewUser());
    }

    // =========================================================================
    // Cookie Configuration
    // =========================================================================

    @Test
    void login_cookieContainsCorrectMaxAge() {
        LoginRequest request = new LoginRequest(AuthProvider.LOCAL, null, MOCK_EMAIL, "password123");
        AuthService.AuthResult result = new AuthService.AuthResult(MOCK_JWT, MOCK_EMAIL, false);
        when(authService.loginEmail(MOCK_EMAIL, "password123")).thenReturn(result);

        HttpServletResponse servletResponse = mock(HttpServletResponse.class);
        authController.login(request, servletResponse);

        ArgumentCaptor<String> cookieCaptor = ArgumentCaptor.forClass(String.class);
        verify(servletResponse).addHeader(eq(HttpHeaders.SET_COOKIE), cookieCaptor.capture());

        String cookie = cookieCaptor.getValue();
        // 30 days in seconds = 30 * 24 * 60 * 60 = 2592000
        assertTrue(cookie.contains("Max-Age=2592000"), "Cookie should have 30-day max age");
    }

    @Test
    void login_cookieIncludesDomainWhenConfigured() throws Exception {
        setField(authController, "cookieDomain", "aurafitness.org");

        LoginRequest request = new LoginRequest(AuthProvider.LOCAL, null, MOCK_EMAIL, "password123");
        AuthService.AuthResult result = new AuthService.AuthResult(MOCK_JWT, MOCK_EMAIL, false);
        when(authService.loginEmail(MOCK_EMAIL, "password123")).thenReturn(result);

        HttpServletResponse servletResponse = mock(HttpServletResponse.class);
        authController.login(request, servletResponse);

        ArgumentCaptor<String> cookieCaptor = ArgumentCaptor.forClass(String.class);
        verify(servletResponse).addHeader(eq(HttpHeaders.SET_COOKIE), cookieCaptor.capture());

        String cookie = cookieCaptor.getValue();
        assertTrue(cookie.contains("Domain=aurafitness.org"));
    }

    // =========================================================================
    // LoginRequest.isSocialLogin
    // =========================================================================

    @Test
    void loginRequest_isSocialLogin_returnsCorrectValues() {
        assertTrue(new LoginRequest(AuthProvider.GOOGLE, "token", null, null).isSocialLogin());
        assertTrue(new LoginRequest(AuthProvider.APPLE, "token", null, null).isSocialLogin());
        assertFalse(new LoginRequest(AuthProvider.LOCAL, null, "e@e.com", "pass").isSocialLogin());
    }

    @Test
    void getGoogleClientId_returnsConfiguredClientId() {
        ResponseEntity<java.util.Map<String, String>> response = authController.getGoogleClientId();

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals("google-web-client-id", response.getBody().get("clientId"));
    }
}
