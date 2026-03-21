package com.fitnessapp.backend.auth;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.interfaces.JWTVerifier;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.RSAPublicKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class AppleTokenValidator implements SocialTokenValidator {

    private static final String APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys";
    private static final String APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token";
    private static final String APPLE_ISSUER = "https://appleid.apple.com";
    private static final Duration KEY_CACHE_DURATION = Duration.ofHours(24);
    private static final Duration CLIENT_SECRET_LIFETIME = Duration.ofDays(180); // max 6 months

    private final Map<String, RSAPublicKey> keyCache = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${app.apple.client-id:}")
    private String clientIdConfig;

    @Value("${app.apple.team-id:}")
    private String teamId;

    @Value("${app.apple.key-id:}")
    private String keyId;

    @Value("${app.apple.private-key:}")
    private String privateKeyPem;

    @Value("${app.apple.private-key-path:}")
    private String privateKeyPath;

    private volatile long lastKeyFetch = 0;

    @Override
    public AuthProvider getProvider() {
        return AuthProvider.APPLE;
    }

    @Override
    public Optional<SocialUserInfo> validate(String idToken) {
        return validate(idToken, null);
    }

    @Override
    public Optional<SocialUserInfo> validate(String idToken, String rawNonce) {
        try {
            DecodedJWT jwt = JWT.decode(idToken);
            String kid = jwt.getKeyId();

            RSAPublicKey publicKey = getPublicKey(kid);
            if (publicKey == null) {
                log.warn("Could not find Apple public key for kid: {}", kid);
                return Optional.empty();
            }

            Algorithm algorithm = Algorithm.RSA256(publicKey, null);
            JWTVerifier verifier = JWT.require(algorithm)
                    .withIssuer(APPLE_ISSUER)
                    .build();

            DecodedJWT verified = verifier.verify(idToken);
            if (!hasAllowedAudience(verified.getAudience())) {
                log.warn("Apple token audience is not allowed. aud={}", verified.getAudience());
                return Optional.empty();
            }

            // Verify nonce if provided (replay-attack prevention per Apple's guidelines)
            if (rawNonce != null && !rawNonce.isBlank()) {
                String tokenNonce = verified.getClaim("nonce").asString();
                if (tokenNonce == null || tokenNonce.isBlank()) {
                    log.warn("Apple token missing nonce claim but client sent nonce");
                    return Optional.empty();
                }
                String expectedHash = sha256Hex(rawNonce);
                boolean matchesHashedNonce = tokenNonce.equalsIgnoreCase(expectedHash);
                boolean matchesRawNonce = tokenNonce.equals(rawNonce);
                if (!matchesHashedNonce && !matchesRawNonce) {
                    log.warn("Apple token nonce mismatch");
                    return Optional.empty();
                }
            }

            String email = verified.getClaim("email").asString();
            if (email == null || email.isBlank()) {
                log.warn("Apple token missing email");
                return Optional.empty();
            }

            String sub = verified.getSubject();

            // Apple doesn't always provide name in the token
            // Name is only provided on first sign-in via the authorization response
            String name = null;

            return Optional.of(new SocialUserInfo(email, name, sub));

        } catch (JWTVerificationException e) {
            log.debug("Apple token verification failed: {}", e.getMessage());
            return Optional.empty();
        } catch (Exception e) {
            log.error("Failed to validate Apple token", e);
            return Optional.empty();
        }
    }

    /**
     * Verify a JWS payload signed by Apple (used for server-to-server notifications).
     * Returns the decoded JWT if valid, empty otherwise.
     */
    public Optional<DecodedJWT> verifyAppleJws(String jws) {
        try {
            DecodedJWT jwt = JWT.decode(jws);
            String kid = jwt.getKeyId();

            RSAPublicKey publicKey = getPublicKey(kid);
            if (publicKey == null) {
                log.warn("Could not find Apple public key for kid: {}", kid);
                return Optional.empty();
            }

            Algorithm algorithm = Algorithm.RSA256(publicKey, null);
            JWTVerifier verifier = JWT.require(algorithm)
                    .withIssuer(APPLE_ISSUER)
                    .build();

            return Optional.of(verifier.verify(jws));
        } catch (JWTVerificationException e) {
            log.warn("Apple JWS verification failed: {}", e.getMessage());
            return Optional.empty();
        } catch (Exception e) {
            log.error("Failed to verify Apple JWS", e);
            return Optional.empty();
        }
    }

    /**
     * Exchange an authorization code for tokens via Apple's token endpoint.
     * Returns the refresh token if successful.
     *
     * @param authorizationCode the single-use authorization code from Apple (valid 5 min)
     * @return the refresh token, or empty if exchange is not configured or fails
     */
    public Optional<String> exchangeAuthorizationCode(String authorizationCode) {
        if (!isCodeExchangeConfigured()) {
            log.debug("Apple auth code exchange not configured (missing team-id, key-id, or private-key)");
            return Optional.empty();
        }

        try {
            String clientSecret = generateClientSecret();
            String clientId = getPrimaryClientId();
            if (clientId == null) {
                log.warn("Cannot exchange auth code: no client ID configured");
                return Optional.empty();
            }

            String requestBody = "client_id=" + clientId
                    + "&client_secret=" + clientSecret
                    + "&code=" + authorizationCode
                    + "&grant_type=authorization_code";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(APPLE_TOKEN_URL))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.warn("Apple token exchange failed: HTTP {} - {}", response.statusCode(), response.body());
                return Optional.empty();
            }

            JsonNode body = objectMapper.readTree(response.body());
            String refreshToken = body.has("refresh_token") ? body.get("refresh_token").asText() : null;

            if (refreshToken != null && !refreshToken.isBlank()) {
                log.info("Successfully exchanged Apple authorization code for refresh token");
                return Optional.of(refreshToken);
            }

            log.warn("Apple token response missing refresh_token");
            return Optional.empty();

        } catch (Exception e) {
            log.error("Failed to exchange Apple authorization code", e);
            return Optional.empty();
        }
    }

    /**
     * Verify a refresh token is still valid by calling Apple's token endpoint.
     *
     * @param refreshToken the stored refresh token
     * @return true if the token is still valid
     */
    public boolean verifyRefreshToken(String refreshToken) {
        if (!isCodeExchangeConfigured()) {
            return false;
        }

        try {
            String clientSecret = generateClientSecret();
            String clientId = getPrimaryClientId();
            if (clientId == null) {
                return false;
            }

            String requestBody = "client_id=" + clientId
                    + "&client_secret=" + clientSecret
                    + "&refresh_token=" + refreshToken
                    + "&grant_type=refresh_token";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(APPLE_TOKEN_URL))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return response.statusCode() == 200;

        } catch (Exception e) {
            log.error("Failed to verify Apple refresh token", e);
            return false;
        }
    }

    boolean isCodeExchangeConfigured() {
        return teamId != null && !teamId.isBlank()
                && keyId != null && !keyId.isBlank()
                && hasPrivateKey();
    }

    private boolean hasPrivateKey() {
        return (privateKeyPem != null && !privateKeyPem.isBlank())
                || (privateKeyPath != null && !privateKeyPath.isBlank());
    }

    private String resolvePrivateKeyPem() throws Exception {
        // Prefer inline PEM content, fall back to file path
        if (privateKeyPem != null && !privateKeyPem.isBlank()) {
            return privateKeyPem;
        }
        if (privateKeyPath != null && !privateKeyPath.isBlank()) {
            return Files.readString(Path.of(privateKeyPath));
        }
        throw new IllegalStateException("No Apple private key configured (set private-key or private-key-path)");
    }

    private String generateClientSecret() throws Exception {
        ECPrivateKey ecPrivateKey = loadPrivateKey(resolvePrivateKeyPem());
        String clientId = getPrimaryClientId();

        Instant now = Instant.now();

        return JWT.create()
                .withKeyId(keyId)
                .withIssuer(teamId)
                .withSubject(clientId)
                .withAudience(APPLE_ISSUER)
                .withIssuedAt(Date.from(now))
                .withExpiresAt(Date.from(now.plus(CLIENT_SECRET_LIFETIME)))
                .sign(Algorithm.ECDSA256(null, ecPrivateKey));
    }

    private ECPrivateKey loadPrivateKey(String keyContent) throws Exception {
        String cleanedKey = keyContent
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s", "");
        byte[] keyBytes = Base64.getDecoder().decode(cleanedKey);
        PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(keyBytes);
        KeyFactory kf = KeyFactory.getInstance("EC");
        return (ECPrivateKey) kf.generatePrivate(spec);
    }

    private String getPrimaryClientId() {
        List<String> ids = getAllowedClientIds();
        return ids.isEmpty() ? null : ids.get(0);
    }

    private static String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    private RSAPublicKey getPublicKey(String kid) {
        refreshKeysIfNeeded();
        return keyCache.get(kid);
    }

    private synchronized void refreshKeysIfNeeded() {
        long now = System.currentTimeMillis();
        if (now - lastKeyFetch < KEY_CACHE_DURATION.toMillis() && !keyCache.isEmpty()) {
            return;
        }

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(APPLE_KEYS_URL))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("Failed to fetch Apple public keys: HTTP {}", response.statusCode());
                return;
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode keys = root.get("keys");

            keyCache.clear();
            for (JsonNode keyNode : keys) {
                String kid = keyNode.get("kid").asText();
                String n = keyNode.get("n").asText();
                String e = keyNode.get("e").asText();

                RSAPublicKey publicKey = createPublicKey(n, e);
                keyCache.put(kid, publicKey);
            }

            lastKeyFetch = now;
            log.info("Refreshed Apple public keys, found {} keys", keyCache.size());

        } catch (Exception e) {
            log.error("Failed to refresh Apple public keys", e);
        }
    }

    private RSAPublicKey createPublicKey(String modulusBase64, String exponentBase64) throws Exception {
        byte[] modulusBytes = Base64.getUrlDecoder().decode(modulusBase64);
        byte[] exponentBytes = Base64.getUrlDecoder().decode(exponentBase64);

        BigInteger modulus = new BigInteger(1, modulusBytes);
        BigInteger exponent = new BigInteger(1, exponentBytes);

        RSAPublicKeySpec spec = new RSAPublicKeySpec(modulus, exponent);
        KeyFactory factory = KeyFactory.getInstance("RSA");
        return (RSAPublicKey) factory.generatePublic(spec);
    }

    @PostConstruct
    void init() {
        if (getAllowedClientIds().isEmpty()) {
            log.warn("Apple client ID not configured - Apple Sign In will not work");
        } else {
            // Pre-fetch keys on startup
            refreshKeysIfNeeded();
        }
        if (isCodeExchangeConfigured()) {
            log.info("Apple auth code exchange is configured (team-id, key-id, private-key present)");
        } else {
            log.info("Apple auth code exchange not configured - refresh token features disabled");
        }
    }

    private boolean hasAllowedAudience(List<String> audience) {
        if (audience == null || audience.isEmpty()) {
            return false;
        }
        List<String> allowedClientIds = getAllowedClientIds();
        if (allowedClientIds.isEmpty()) {
            // No client IDs configured — skip audience validation (like Google's verifier).
            // This allows local development without setting APPLE_CLIENT_ID.
            // In production, APPLE_CLIENT_ID MUST be set for proper audience validation.
            log.warn("No Apple client IDs configured — skipping audience validation. "
                    + "Set APPLE_CLIENT_ID env var for production security.");
            return true;
        }
        return audience.stream().anyMatch(allowedClientIds::contains);
    }

    private List<String> getAllowedClientIds() {
        if (clientIdConfig == null || clientIdConfig.isBlank()) {
            return List.of();
        }
        return Arrays.stream(clientIdConfig.split(","))
                .map(String::trim)
                .filter(v -> !v.isBlank())
                .collect(Collectors.toList());
    }
}
