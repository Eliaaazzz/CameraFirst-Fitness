import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const JWT_KEY = 'aura_jwt_token';
const REFRESH_TOKEN_KEY = 'aura_refresh_token';
const USER_EMAIL_KEY = 'aura_user_email';

/**
 * Platform-aware storage helpers
 * Uses SecureStore on native (iOS/Android) and localStorage on web
 */
async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  } else {
    return await SecureStore.getItemAsync(key);
  }
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

/**
 * Save JWT and optional refresh token to secure storage
 */
export async function saveJWT(jwtToken: string, refreshToken?: string, userEmail?: string) {
  try {
    console.log('[saveJWT] Saving JWT token, length:', jwtToken?.length);
    await setItem(JWT_KEY, jwtToken);
    if (refreshToken) {
      await setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    if (userEmail) {
      await setItem(USER_EMAIL_KEY, userEmail);
    }
    console.log('✅ JWT saved to secure storage');

    // Verify it was saved correctly
    const savedToken = await getItem(JWT_KEY);
    console.log('[saveJWT] Verification - token saved correctly:', savedToken === jwtToken);
  } catch (error) {
    console.error('❌ Failed to save JWT to secure storage:', error);
    throw new Error('Failed to save authentication token');
  }
}

/**
 * Retrieve JWT from secure storage
 * IMPORTANT: Does NOT check expiration to avoid race conditions during login
 * Let the backend validate and return 401 if truly expired
 */
export async function getJWT(): Promise<string | null> {
  try {
    const token = await getItem(JWT_KEY);
    console.log('[getJWT] Token retrieved, exists:', !!token, 'length:', token?.length);
    if (!token) {
      return null;
    }
    
    // DO NOT check expiration here - this causes race conditions during login
    // The backend will validate the token and return 401 if expired
    // Frontend should only clear JWT on explicit 401 response from backend
    
    return token;
  } catch (error) {
    console.error('❌ Failed to retrieve JWT from secure storage:', error);
    return null;
  }
}

/**
 * Retrieve refresh token from secure storage
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    const token = await getItem(REFRESH_TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('❌ Failed to retrieve refresh token:', error);
    return null;
  }
}

/**
 * Retrieve user email from secure storage
 */
export async function getUserEmail(): Promise<string | null> {
  try {
    const email = await getItem(USER_EMAIL_KEY);
    return email;
  } catch (error) {
    console.error('❌ Failed to retrieve user email:', error);
    return null;
  }
}

/**
 * Clear all authentication tokens from secure storage
 */
export async function clearJWT(): Promise<void> {
  try {
    await deleteItem(JWT_KEY);
    await deleteItem(REFRESH_TOKEN_KEY);
    await deleteItem(USER_EMAIL_KEY);
    console.log('✅ JWT cleared from secure storage');
  } catch (error) {
    console.error('❌ Failed to clear JWT from secure storage:', error);
  }
}

/**
 * Base64url decode that works on all platforms (Web, iOS, Android/Hermes)
 * Handles base64url encoding (- and _ chars) and padding
 */
function base64UrlDecode(input: string): string {
  // Convert base64url to base64
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if needed
  const padding = base64.length % 4;
  if (padding === 2) {
    base64 += '==';
  } else if (padding === 3) {
    base64 += '=';
  }

  // Use platform-appropriate decoding
  // Hermes and modern React Native support atob globally
  if (typeof atob === 'function') {
    return atob(base64);
  } else if (Platform.OS === 'web' && typeof window !== 'undefined' && window.atob) {
    return window.atob(base64);
  } else {
    // Native (iOS/Android) fallback: use Buffer-like manual decoding
    // This avoids atob which may not exist or work correctly on older runtimes
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';

    for (let i = 0; i < base64.length; i += 4) {
      const enc1 = chars.indexOf(base64.charAt(i));
      const enc2 = chars.indexOf(base64.charAt(i + 1));
      const enc3 = chars.indexOf(base64.charAt(i + 2));
      const enc4 = chars.indexOf(base64.charAt(i + 3));

      const chr1 = (enc1 << 2) | (enc2 >> 4);
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      const chr3 = ((enc3 & 3) << 6) | enc4;

      output += String.fromCharCode(chr1);
      if (enc3 !== 64) output += String.fromCharCode(chr2);
      if (enc4 !== 64) output += String.fromCharCode(chr3);
    }

    return output;
  }
}

/**
 * Decode JWT token to get payload (without verification)
 * WARNING: This only decodes, does not verify signature
 * Works on Web, iOS, and Android (including Hermes runtime)
 */
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('[JWT] Invalid token format: expected 3 parts, got', parts.length);
      return null;
    }

    const base64Payload = parts[1];
    const decoded = base64UrlDecode(base64Payload);

    // Handle UTF-8 encoded characters
    const jsonPayload = decodeURIComponent(
      decoded
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(jsonPayload);
    console.log('[JWT] Successfully decoded token for user:', payload.email || payload.sub);
    return payload;
  } catch (error) {
    console.error('[JWT] Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Check if JWT token is expired
 * Returns true ONLY if we can confirm the token is expired
 * Returns false if decode fails (let backend validate and return 401)
 */
export function isJWTExpired(token: string): boolean {
  const payload = decodeJWT(token);

  // If we can't decode, DON'T treat as expired - let backend validate
  // This prevents clearing valid tokens due to platform-specific decode issues
  if (!payload) {
    console.warn('[JWT] Could not decode token - assuming valid, backend will validate');
    return false;
  }

  // If no expiration claim, assume valid (backend will validate)
  if (!payload.exp) {
    console.warn('[JWT] Token has no exp claim - assuming valid, backend will validate');
    return false;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  console.log('[JWT] Checking expiration. Current:', currentTime, 'Exp:', payload.exp);
  // Add 5 second buffer to allow for clock skew
  // (reduced from 60s to avoid false positives on fresh tokens)
  const isExpired = payload.exp < (currentTime + 5);

  if (isExpired) {
    console.log('[JWT] Token expired at', new Date(payload.exp * 1000).toISOString());
  }

  return isExpired;
}

/**
 * Check if user is authenticated (has valid JWT)
 * Note: Only checks if token exists and is not obviously expired
 * Backend will do the final validation
 */
export async function isAuthenticated(): Promise<boolean> {
  console.log('[isAuthenticated] Checking authentication...');
  try {
    const token = await getJWT();
    console.log('[isAuthenticated] Token exists:', !!token, 'length:', token?.length);
    if (!token) {
      console.log('[isAuthenticated] No token found, returning false');
      return false;
    }

    // OPTIMIZATION: Trust the token if it exists.
    // Do not check expiration client-side to avoid clock skew issues.
    // The backend will return 401 if the token is invalid/expired,
    // and apiClient will handle the cleanup.
    console.log('[isAuthenticated] Token exists, assuming valid (backend will validate)');
    return true;
  } catch (error) {
    console.error('[isAuthenticated] Error during auth check:', error);
    return false;
  }
}