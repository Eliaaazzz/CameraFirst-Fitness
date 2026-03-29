package com.fitnessapp.backend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.UNAUTHORIZED)
public class InvalidTokenException extends AuthenticationException {

    public InvalidTokenException(String message) {
        super(message);
    }

    public InvalidTokenException(AuthProvider provider) {
        super("Sign in with " + provider.name().substring(0, 1) + provider.name().substring(1).toLowerCase()
                + " could not be verified. Please try again.");
    }
}
