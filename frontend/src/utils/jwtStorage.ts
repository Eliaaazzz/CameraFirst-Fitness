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
    await setItem(JWT_KEY, jwtToken);
    if (refreshToken) {
      await setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    if (userEmail) {
      await setItem(USER_EMAIL_KEY, userEmail);
    }
    console.log('✅ JWT saved to secure storage');
  } catch (error) {
    console.error('❌ Failed to save JWT to secure storage:', error);
    throw new Error('Failed to save authentication token');
  }
}

/**
 * Retrieve JWT from secure storage
 * Automatically clears token if expired
 */
export async function getJWT(): Promise<string | null> {
  try {
    const token = await getItem(JWT_KEY);
    if (!token) {
      return null;
    }
    
    // Check if token is expired
    if (isJWTExpired(token)) {
      console.warn('⚠️ JWT token expired, clearing from storage');
      await clearJWT();
      return null;
    }
    
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
 * Decode JWT token to get payload (without verification)
 * WARNING: This only decodes, does not verify signature
 */
function decodeJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('❌ Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Check if JWT token is expired
 * Returns true if expired or invalid
 */
export function isJWTExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true; // Invalid token or no expiration
  }
  
  const currentTime = Math.floor(Date.now() / 1000);
  // Add 60 second buffer to refresh before actual expiration
  return payload.exp < (currentTime + 60);
}

/**
 * Check if user is authenticated (has valid JWT)
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getJWT();
  if (!token) {
    return false;
  }
  
  // Check if token is expired
  if (isJWTExpired(token)) {
    console.warn('⚠️ JWT token is expired, clearing storage');
    await clearJWT();
    return false;
  }
  
  return true;
}
