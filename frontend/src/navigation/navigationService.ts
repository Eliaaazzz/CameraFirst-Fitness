import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';

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
 * Navigate to Login screen after logout
 * Goes directly to Login instead of Splash to avoid auth check loop
 */
export function navigateToLogin() {
  console.log('[NavigationService] Navigating to Login screen');
  console.log('[NavigationService] navigationRef.isReady():', navigationRef.isReady());
  console.log('[NavigationService] navigationRef.current:', navigationRef.current);
  resetToScreen('Login');
}
