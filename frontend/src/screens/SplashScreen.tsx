import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuthStore } from '@/stores';

/**
 * Splash/Loading screen that restores authentication state on app launch.
 * Uses Zustand auth store to:
 * 1. Load cached userInfo for instant display
 * 2. Validate token with backend
 * 3. Navigate to Main or Login based on auth state
 */
export default function SplashScreen() {
  const navigation = useNavigation();
  const { isRestoringToken, isAuthenticated, restoreToken } = useAuthStore();
  const hasStartedRestoreRef = useRef(false);

  useEffect(() => {
    if (hasStartedRestoreRef.current) {
      return;
    }
    hasStartedRestoreRef.current = true;

    const initAuth = async () => {
      console.log('[SplashScreen] Starting auth restoration...');

      // Restore token and user info from storage
      await restoreToken();

      console.log('[SplashScreen] Auth restoration complete');
    };

    // Small delay to ensure storage is ready
    const timer = setTimeout(initAuth, 500);

    return () => clearTimeout(timer);
  }, [restoreToken]);

  // Navigate once restoration is complete
  useEffect(() => {
    if (isRestoringToken) {
      return; // Still loading
    }

    console.log('[SplashScreen] Restoration done, isAuthenticated:', isAuthenticated);

    if (isAuthenticated) {
      console.log('[SplashScreen] User is authenticated, navigating to Main');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' } as any],
      });
    } else {
      console.log('[SplashScreen] User is NOT authenticated, navigating to Login');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' } as any],
      });
    }
  }, [isRestoringToken, isAuthenticated, navigation]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#2196F3" />
    </View>
  );
}
