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
  }
}

/**
 * Navigate to Login screen after logout
 */
export function navigateToLogin() {
  resetToScreen('Splash');
}
