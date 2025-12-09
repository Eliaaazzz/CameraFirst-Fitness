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
import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class AppleTokenValidator implements SocialTokenValidator {

    private static final String APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys";
    private static final String APPLE_ISSUER = "https://appleid.apple.com";
    private static final Duration KEY_CACHE_DURATION = Duration.ofHours(24);

    private final Map<String, RSAPublicKey> keyCache = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${app.apple.client-id:}")
    private String clientId;

    private volatile long lastKeyFetch = 0;

    @Override
    public AuthProvider getProvider() {
        return AuthProvider.APPLE;
    }

    @Override
    public Optional<SocialUserInfo> validate(String idToken) {
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
                    .withAudience(clientId)
                    .build();

            DecodedJWT verified = verifier.verify(idToken);

            String email = verified.getClaim("email").asString();
            if (email == null || email.isBlank()) {
                log.warn("Apple token missing email");
                return Optional.empty();
            }

            // Apple doesn't always provide name in the token
            // Name is only provided on first sign-in via the authorization response
            String name = null;

            return Optional.of(new SocialUserInfo(email, name));

        } catch (JWTVerificationException e) {
            log.debug("Apple token verification failed: {}", e.getMessage());
            return Optional.empty();
        } catch (Exception e) {
            log.error("Failed to validate Apple token", e);
            return Optional.empty();
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
        if (clientId == null || clientId.isBlank()) {
            log.warn("Apple client ID not configured - Apple Sign In will not work");
        } else {
            // Pre-fetch keys on startup
            refreshKeysIfNeeded();
        }
    }
}
