/**
 * Hook to verify Apple credential state on iOS.
 *
 * Per Apple's guidelines, apps should call getCredentialStateAsync on launch
 * to detect if the user's Apple Account has been revoked, deleted, or
 * transferred. If the credential is no longer authorized, sign the user out.
 *
 * This is a local, inexpensive check that doesn't hit Apple's servers.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Device from 'expo-device';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useAuthStore } from '@/stores';

export function useAppleCredentialCheck() {
  const { isAuthenticated, userInfo, signOut } = useAuthStore();

  useEffect(() => {
    // Only runs on physical iOS devices, only for authenticated Apple users.
    // The simulator frequently reports stale/revoked credential state for
    // otherwise valid Apple sessions, which immediately signs the user out
    // after a successful login.
    if (Platform.OS !== 'ios') return;
    if (!Device.isDevice) {
      console.log('[AppleCredentialCheck] Skipping credential state check on iOS simulator');
      return;
    }
    if (!isAuthenticated) return;
    if (userInfo?.authProvider !== 'APPLE') return;
    if (!userInfo?.appleUserId) return;

    const appleUserId = userInfo.appleUserId;

    const checkCredentialState = async () => {
      try {
        const state = await AppleAuthentication.getCredentialStateAsync(appleUserId);

        switch (state) {
          case AppleAuthentication.AppleAuthenticationCredentialState.REVOKED:
            console.log('[AppleCredentialCheck] Credential revoked, signing out');
            await signOut();
            break;
          case AppleAuthentication.AppleAuthenticationCredentialState.NOT_FOUND:
            console.log('[AppleCredentialCheck] Credential not found, signing out');
            await signOut();
            break;
          case AppleAuthentication.AppleAuthenticationCredentialState.TRANSFERRED:
            console.log('[AppleCredentialCheck] Credential transferred, signing out');
            await signOut();
            break;
          case AppleAuthentication.AppleAuthenticationCredentialState.AUTHORIZED:
            // Credential is valid, nothing to do
            break;
          default:
            console.log('[AppleCredentialCheck] Unknown credential state:', state);
        }
      } catch (error) {
        console.warn('[AppleCredentialCheck] Failed to check credential state:', error);
        // Don't sign out on error - could be a transient issue
      }
    };

    void checkCredentialState();
  }, [isAuthenticated, userInfo?.authProvider, userInfo?.appleUserId, signOut]);
}
