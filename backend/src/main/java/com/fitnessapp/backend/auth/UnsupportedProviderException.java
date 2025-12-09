package com.fitnessapp.backend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class UnsupportedProviderException extends AuthenticationException {

    public UnsupportedProviderException(AuthProvider provider) {
        super("Unsupported authentication provider: " + provider.name());
    }
}
