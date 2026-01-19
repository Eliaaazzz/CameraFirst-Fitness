import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';

import { useNavigation } from '@react-navigation/native';

import { useSidebarVisible } from '@/utils';

interface KeyboardShortcutsOptions {
  onAddFood?: () => void;
  onSearch?: () => void;
  enabled?: boolean;
}

/**
 * useKeyboardShortcuts - Keyboard shortcuts for desktop web
 *
 * Shortcuts:
 * - C: Add food / open camera
 * - 1: Navigate to Dashboard
 * - 2: Navigate to Workouts
 * - 3: Navigate to Recipes
 * - 4: Navigate to Profile
 * - /: Focus search (if onSearch provided)
 * - ?: Show help (future)
 *
 * Only active on web with sidebar visible (desktop mode)
 */
export function useKeyboardShortcuts({
  onAddFood,
  onSearch,
  enabled = true,
}: KeyboardShortcutsOptions = {}) {
  const navigation = useNavigation<any>();
  const isDesktop = useSidebarVisible();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Don't trigger if modifier keys are pressed (except for /)
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'c':
          // Add food / open camera
          if (onAddFood) {
            event.preventDefault();
            onAddFood();
          }
          break;

        case '1':
          // Navigate to Dashboard
          event.preventDefault();
          navigation.navigate('Dashboard');
          break;

        case '2':
          // Navigate to Workouts
          event.preventDefault();
          navigation.navigate('Workouts');
          break;

        case '3':
          // Navigate to Recipes
          event.preventDefault();
          navigation.navigate('Recipes');
          break;

        case '4':
          // Navigate to Profile
          event.preventDefault();
          navigation.navigate('Profile');
          break;

        case '/':
          // Focus search
          if (onSearch) {
            event.preventDefault();
            onSearch();
          }
          break;
      }
    },
    [navigation, onAddFood, onSearch]
  );

  useEffect(() => {
    // Only enable keyboard shortcuts on web desktop mode
    if (Platform.OS !== 'web' || !isDesktop || !enabled) {
      return;
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, isDesktop, enabled]);
}

export default useKeyboardShortcuts;
