package com.fitnessapp.backend.auth;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.user.repository.UserRepository;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final JwtUtils jwtUtils;
    private final PasswordEncoder passwordEncoder;
    private final Map<AuthProvider, SocialTokenValidator> validators;

    public AuthService(
            UserRepository userRepository,
            UserProfileRepository userProfileRepository,
            JwtUtils jwtUtils,
            PasswordEncoder passwordEncoder,
            List<SocialTokenValidator> validatorList) {
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
        this.jwtUtils = jwtUtils;
        this.passwordEncoder = passwordEncoder;

        // Build the strategy map from injected validators
        this.validators = new EnumMap<>(AuthProvider.class);
        for (SocialTokenValidator validator : validatorList) {
            validators.put(validator.getProvider(), validator);
        }
    }

    public record AuthResult(String token, String email, boolean isNewUser) {}

    /**
     * Authenticates a user via a social provider (Google, Apple).
     *
     * @param provider the social auth provider
     * @param idToken  the ID token from the provider
     * @return auth result with JWT token
     * @throws InvalidTokenException if token is invalid
     * @throws UnsupportedProviderException if provider is not supported
     */
    @Transactional
    public AuthResult loginSocial(AuthProvider provider, String idToken) {
        return loginSocial(provider, idToken, null);
    }

    @Transactional
    public AuthResult loginSocial(AuthProvider provider, String idToken, String fullName) {
        if (provider == AuthProvider.LOCAL) {
            throw new UnsupportedProviderException(provider);
        }

        SocialTokenValidator validator = validators.get(provider);
        if (validator == null) {
            throw new UnsupportedProviderException(provider);
        }

        SocialUserInfo userInfo = validator.validate(idToken)
                .orElseThrow(() -> new InvalidTokenException(provider));

        Optional<User> existingUser = userRepository.findByEmail(userInfo.email());
        boolean isNewUser = existingUser.isEmpty();
        String preferredUsername = normalizePreferredUsername(fullName, userInfo.name());
        String explicitUsername = normalizePreferredUsername(fullName);

        User user;
        if (isNewUser) {
            user = User.builder()
                    .email(userInfo.email())
                    .authProvider(provider)
                    .username(preferredUsername)
                    .timeBucket(0)
                    .level("beginner")
                    .build();
            user = userRepository.save(user);
            log.info("Created new user via {}: {}", provider, userInfo.email());
            
            // Create empty UserProfile for new users (required for nutrition tracking)
            UserProfile profile = new UserProfile();
            profile.setUser(user);
            userProfileRepository.save(profile);
            log.info("Created default UserProfile for user: {}", user.getId());
        } else {
            user = existingUser.get();
            // Optionally update auth provider if user previously registered differently
            if (user.getAuthProvider() != provider) {
                log.info("User {} logged in via {} (was {})",
                        userInfo.email(), provider, user.getAuthProvider());
            }
            if ((user.getUsername() == null || user.getUsername().isBlank()) && explicitUsername != null) {
                user.setUsername(explicitUsername);
                user = userRepository.save(user);
            }
        }

        String jwt = jwtUtils.generateToken(user.getId(), user.getEmail());
        return new AuthResult(jwt, user.getEmail(), isNewUser);
    }

    private String normalizePreferredUsername(String... candidates) {
        for (String candidate : candidates) {
            if (candidate == null) {
                continue;
            }

            String normalized = candidate.trim().replaceAll("\\s+", " ");
            if (normalized.isBlank()) {
                continue;
            }

            return normalized.length() > 100 ? normalized.substring(0, 100) : normalized;
        }
        return null;
    }

    /**
     * Authenticates a user via email and password.
     *
     * @param email    user's email
     * @param password user's password
     * @return auth result with JWT token
     * @throws InvalidCredentialsException if credentials are invalid
     */
    public AuthResult loginEmail(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(InvalidCredentialsException::new);

        if (user.getAuthProvider() != AuthProvider.LOCAL) {
            // User registered via social login, doesn't have a password
            throw new InvalidCredentialsException();
        }

        if (user.getPasswordHash() == null ||
            !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        String jwt = jwtUtils.generateToken(user.getId(), user.getEmail());
        log.info("User {} logged in via email/password", email);
        return new AuthResult(jwt, user.getEmail(), false);
    }

    /**
     * Registers a new user with email and password.
     *
     * @param email    user's email
     * @param password user's password
     * @return auth result with JWT token
     * @throws EmailAlreadyExistsException if email is already registered
     */
    @Transactional
    public AuthResult registerEmail(String email, String password) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new EmailAlreadyExistsException(email);
        }

        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .authProvider(AuthProvider.LOCAL)
                .timeBucket(0)
                .level("beginner")
                .build();
        user = userRepository.save(user);
        
        // Create empty UserProfile for new users (required for nutrition tracking)
        UserProfile profile = new UserProfile();
        profile.setUser(user);
        userProfileRepository.save(profile);
        log.info("Created default UserProfile for user: {}", user.getId());

        String jwt = jwtUtils.generateToken(user.getId(), user.getEmail());
        log.info("Registered new user via email: {}", email);
        return new AuthResult(jwt, user.getEmail(), true);
    }
}


