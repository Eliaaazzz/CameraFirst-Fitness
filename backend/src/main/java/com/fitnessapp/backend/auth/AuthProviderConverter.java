package com.fitnessapp.backend.auth;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;

/**
 * Lenient converter for AuthProvider values stored in the database.
 * Normalizes unexpected values to a safe default instead of throwing
 * IllegalArgumentException (which was causing 500s on /api/v1/me).
 */
@Slf4j
@Converter(autoApply = true)
public class AuthProviderConverter implements AttributeConverter<AuthProvider, String> {

  @Override
  public String convertToDatabaseColumn(AuthProvider attribute) {
    return attribute != null ? attribute.name() : AuthProvider.API_KEY.name();
  }

  @Override
  public AuthProvider convertToEntityAttribute(String dbData) {
    if (dbData == null || dbData.isBlank()) {
      return AuthProvider.API_KEY;
    }
    try {
      // Normalize common variants (e.g., "api key", "api-key")
      String normalized = dbData.trim().toUpperCase().replace('-', '_').replace(' ', '_');
      return AuthProvider.valueOf(normalized);
    } catch (IllegalArgumentException ex) {
      log.warn("Unknown auth_provider value '{}' in database, defaulting to API_KEY", dbData);
      return AuthProvider.API_KEY;
    }
  }
}
