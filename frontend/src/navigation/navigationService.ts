import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

/**
 * Navigate and reset to a specific screen from anywhere in the app.
 * This is useful for logout where we need to reset from within nested navigators.
 */
export function resetToScreen(screenName: string) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: screenName }],
      })
    );
  } else {
    console.warn('[NavigationService] Navigation ref not ready, retrying...');
    // Retry after a short delay
    setTimeout(() => {
      if (navigationRef.isReady()) {
        navigationRef.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: screenName }],
          })
        );
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
  resetToScreen('Login');
}
