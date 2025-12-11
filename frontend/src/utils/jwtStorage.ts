import * as SecureStore from 'expo-secure-store';

const JWT_KEY = 'aura_jwt_token';
const REFRESH_TOKEN_KEY = 'aura_refresh_token';
const USER_EMAIL_KEY = 'aura_user_email';

/**
 * Save JWT and optional refresh token to secure storage
 */
export async function saveJWT(jwtToken: string, refreshToken?: string, userEmail?: string) {
  try {
    await SecureStore.setItemAsync(JWT_KEY, jwtToken);
    if (refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    }
    if (userEmail) {
      await SecureStore.setItemAsync(USER_EMAIL_KEY, userEmail);
    }
    console.log('✅ JWT saved to secure storage');
  } catch (error) {
    console.error('❌ Failed to save JWT to secure storage:', error);
    throw new Error('Failed to save authentication token');
  }
}

/**
 * Retrieve JWT from secure storage
 */
export async function getJWT(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(JWT_KEY);
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
    const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
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
    const email = await SecureStore.getItemAsync(USER_EMAIL_KEY);
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
    await SecureStore.deleteItemAsync(JWT_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_EMAIL_KEY);
    console.log('✅ JWT cleared from secure storage');
  } catch (error) {
    console.error('❌ Failed to clear JWT from secure storage:', error);
  }
}

/**
 * Check if user is authenticated (has valid JWT)
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getJWT();
  return !!token;
}
