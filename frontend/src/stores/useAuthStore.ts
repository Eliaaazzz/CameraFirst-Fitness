/**
 * Zustand Auth Store
 *
 * Centralized authentication state management for FitnessMind.
 * Handles token storage, user info, and auth lifecycle across platforms.
 *
 * Platform-aware design:
 * - Mobile (iOS/Android): Token stored in SecureStore, sent via Authorization header
 * - Web: Token stored in HttpOnly cookie (managed by backend), sent automatically
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { navigateToLogin } from '@/navigation/navigationService';
import type { CurrentUserResponse } from '@/types';
import { clearJWT, getJWT, saveJWT } from '@/utils/jwtStorage';

// Storage keys
const USER_INFO_KEY = 'aura_user_info';

// Re-export user types for convenience
export type UserInfo = CurrentUserResponse;

interface AuthState {
  // State
  userToken: string | null; // Mobile only (Web uses HttpOnly Cookie)
  userInfo: UserInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isRestoringToken: boolean;

  // Actions
  signIn: (token: string, userInfo?: UserInfo) => Promise<void>;
  signOut: () => Promise<void>;
  restoreToken: () => Promise<void>;
  updateUserInfo: (userInfo: Partial<UserInfo>) => void;
  setUserInfo: (userInfo: UserInfo) => void;
}

/**
 * Fetch current user info from backend.
 * Uses dynamic import to avoid circular dependency with apiClient.
 */
async function fetchCurrentUser(timeoutMs = 60000): Promise<UserInfo> {
  const { api } = await import('@/services/apiClient');
  return api.get<UserInfo>('/api/v1/me', { timeout: timeoutMs });
}

/**
 * Call logout endpoint to clear HttpOnly cookie (web only).
 */
async function callLogoutEndpoint(): Promise<void> {
  if (Platform.OS !== 'web') return;

  try {
    const { api } = await import('@/services/apiClient');
    await api.post('/api/v1/auth/logout');
    console.log('[AuthStore] Web: HttpOnly cookie cleared via logout endpoint');
  } catch (error) {
    console.warn('[AuthStore] Failed to call logout endpoint:', error);
  }
}

/**
 * Persist userInfo to AsyncStorage for offline access.
 */
async function persistUserInfo(userInfo: UserInfo): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
    console.log('[AuthStore] UserInfo persisted to storage');
  } catch (error) {
    console.warn('[AuthStore] Failed to persist userInfo:', error);
  }
}

/**
 * Load cached userInfo from AsyncStorage.
 */
async function loadCachedUserInfo(): Promise<UserInfo | null> {
  try {
    const cached = await AsyncStorage.getItem(USER_INFO_KEY);
    if (cached) {
      console.log('[AuthStore] Loaded cached userInfo from storage');
      return JSON.parse(cached) as UserInfo;
    }
  } catch (error) {
    console.warn('[AuthStore] Failed to load cached userInfo:', error);
  }
  return null;
}

/**
 * Clear persisted userInfo from AsyncStorage.
 */
async function clearPersistedUserInfo(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USER_INFO_KEY);
    console.log('[AuthStore] Cleared persisted userInfo');
  } catch (error) {
    console.warn('[AuthStore] Failed to clear persisted userInfo:', error);
  }
}

function hasCanonicalUserInfo(userInfo?: UserInfo | null): userInfo is UserInfo {
  return Boolean(
    userInfo &&
    typeof userInfo.userId === 'string' &&
    userInfo.userId.trim().length > 0 &&
    typeof userInfo.username === 'string' &&
    userInfo.username.trim().length > 0
  );
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  userToken: null,
  userInfo: null,
  isLoading: false,
  isAuthenticated: false,
  isRestoringToken: true, // Start true to show splash screen

  /**
   * Sign in user after successful authentication.
   * Saves token to SecureStore (mobile) and persists userInfo.
   */
  signIn: async (token: string, userInfo?: UserInfo) => {
    console.log('[AuthStore] signIn called, token length:', token?.length);

    const isWeb = Platform.OS === 'web';

    // Save token (mobile: SecureStore, web: already in HttpOnly cookie)
    if (!isWeb) {
      await saveJWT(token, undefined, userInfo?.email);
      set({ userToken: token });
    } else {
      // On web, token is in cookie, just save email for reference
      await saveJWT(token, undefined, userInfo?.email);
    }

    // Only persist complete userInfo objects.
    // Placeholder auth payloads from social login can race the first /me fetch and
    // briefly put the app into an inconsistent "authenticated but incomplete" state.
    if (hasCanonicalUserInfo(userInfo)) {
      set({ userInfo, isAuthenticated: true, isLoading: false });
      await persistUserInfo(userInfo);
      return;
    }

    if (userInfo) {
      console.log('[AuthStore] Partial userInfo provided, fetching canonical profile from /api/v1/me before updating auth state');
    }

    // Otherwise fetch from backend
    try {
      set({ isLoading: true });
      const fetchedUser = await fetchCurrentUser();
      set({ userInfo: fetchedUser, isAuthenticated: true, isLoading: false });
      await persistUserInfo(fetchedUser);
    } catch (error) {
      console.error('[AuthStore] Failed to fetch user after signIn:', error);
      // Still mark as authenticated since token is valid, but avoid persisting
      // placeholder userInfo that can confuse the initial post-login render.
      set({ isAuthenticated: true, isLoading: false, userInfo: hasCanonicalUserInfo(userInfo) ? userInfo : null });
    }
  },

  /**
   * Sign out user. Clears all auth state and storage.
   */
  signOut: async () => {
    console.log('[AuthStore] signOut called');

    // Clear HttpOnly cookie on web
    await callLogoutEndpoint();

    // Clear token storage
    await clearJWT();

    // Clear persisted userInfo
    await clearPersistedUserInfo();

    // Reset state
    set({
      userToken: null,
      userInfo: null,
      isAuthenticated: false,
      isLoading: false,
    });

    // Navigate to login
    navigateToLogin();
  },

  /**
   * Restore authentication state on app launch.
   * Reads cached data first for instant UI, then validates with backend.
   */
  restoreToken: async () => {
    console.log('[AuthStore] restoreToken called');
    set({ isRestoringToken: true, isLoading: true });

    const isWeb = Platform.OS === 'web';

    try {
      // Step 1: Load cached userInfo for instant display
      const cachedUserInfo = await loadCachedUserInfo();
      if (cachedUserInfo) {
        set({ userInfo: cachedUserInfo });
        console.log('[AuthStore] Using cached userInfo for instant display');
      }

      // Step 2: Check for token
      if (!isWeb) {
        // Mobile: Read token from SecureStore
        const token = await getJWT();
        console.log('[AuthStore] Mobile: Token exists:', !!token);

        if (!token) {
          // No token = not authenticated
          set({
            isAuthenticated: false,
            isLoading: false,
            isRestoringToken: false,
            userInfo: null,
          });
          await clearPersistedUserInfo();
          return;
        }

        // Store token in memory for API calls
        set({ userToken: token });
      } else {
        // Web: Check if we have cached email (indicates previous login)
        // The actual JWT is in HttpOnly cookie
        const token = await getJWT(); // Returns 'httponly-cookie' marker or null
        console.log('[AuthStore] Web: Has cookie marker:', !!token);

        if (!token) {
          set({
            isAuthenticated: false,
            isLoading: false,
            isRestoringToken: false,
            userInfo: null,
          });
          await clearPersistedUserInfo();
          return;
        }
      }

      // Step 3: Validate token by fetching current user from backend
      console.log('[AuthStore] Validating token with backend...');
      const userInfo = await fetchCurrentUser();

      if (!userInfo) {
        throw new Error('User info is empty after validation');
      }

      // Success - update state with fresh data
      set({
        userInfo,
        isAuthenticated: true,
        isLoading: false,
        isRestoringToken: false,
      });
      await persistUserInfo(userInfo);
      console.log('[AuthStore] Token validated, user:', userInfo?.email || 'unknown');
    } catch (error: any) {
      console.error('[AuthStore] restoreToken failed:', error);

      // Check if it's a 401 (token expired/invalid)
      if (error?.status === 401 || error?.status === 403) {
        console.log('[AuthStore] Token expired/invalid, signing out');
        await get().signOut();
      } else {
        // Network error or other issue - use cached data if available
        const cachedUserInfo = await loadCachedUserInfo();
        if (cachedUserInfo) {
          console.log('[AuthStore] Network error, using cached userInfo');
          set({
            userInfo: cachedUserInfo,
            isAuthenticated: true,
            isLoading: false,
            isRestoringToken: false,
          });
        } else {
          // No cached data, can't authenticate
          set({
            isAuthenticated: false,
            isLoading: false,
            isRestoringToken: false,
          });
        }
      }
    }
  },

  /**
   * Update partial user info (e.g., after profile edit).
   */
  updateUserInfo: (partialUserInfo: Partial<UserInfo>) => {
    const currentUserInfo = get().userInfo;
    if (!currentUserInfo) return;

    const updatedUserInfo = { ...currentUserInfo, ...partialUserInfo };
    set({ userInfo: updatedUserInfo });
    persistUserInfo(updatedUserInfo);
  },

  /**
   * Set complete user info (replaces current).
   */
  setUserInfo: (userInfo: UserInfo) => {
    set({ userInfo });
    persistUserInfo(userInfo);
  },
}));

// Export for use outside React components (e.g., in API interceptors)
export const getAuthState = () => useAuthStore.getState();
