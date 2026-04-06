import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';
import { Platform } from 'react-native';

export const navigationRef = createNavigationContainerRef();

/**
 * Navigate and reset to a specific screen from anywhere in the app.
 * This is useful for logout where we need to reset from within nested navigators.
 */
export function resetToScreen(screenName: string) {
  console.log('[NavigationService] resetToScreen called with:', screenName);
  if (navigationRef.isReady()) {
    console.log('[NavigationService] Navigation ready, dispatching reset...');
    try {
      navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: screenName }],
        })
      );
      console.log('[NavigationService] Reset dispatched successfully');
    } catch (error) {
      console.error('[NavigationService] Reset dispatch failed:', error);
    }
  } else {
    console.warn('[NavigationService] Navigation ref not ready, retrying...');
    // Retry after a short delay
    setTimeout(() => {
      if (navigationRef.isReady()) {
        console.log('[NavigationService] Retry: Navigation now ready');
        navigationRef.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: screenName }],
          })
        );
      } else {
        console.error('[NavigationService] Retry failed: Still not ready');
      }
    }, 100);
  }
}

/**
 * Navigate to the correct unauthenticated entrypoint after logout.
 * Web should return to Landing so users see the fast marketing shell first.
 */
export function navigateToLogin() {
  const screenName = Platform.OS === 'web' ? 'Landing' : 'Login';
  console.log('[NavigationService] Navigating to unauthenticated screen:', screenName);
  console.log('[NavigationService] navigationRef.isReady():', navigationRef.isReady());
  console.log('[NavigationService] navigationRef.current:', navigationRef.current);
  resetToScreen(screenName);
}
