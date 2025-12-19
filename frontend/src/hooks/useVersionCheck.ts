import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// IMPORTANT: Increment this version whenever you make breaking changes
// This will force a clean slate for users upgrading from older versions
// - Increment for: data structure changes, hook fixes, component fixes
const CURRENT_VERSION = '1.5.0'; 
const VERSION_KEY = '@app_version';

/**
 * Hook to detect version changes and clear poisoned cache
 * 
 * This prevents crashes caused by:
 * - Old user object structures in localStorage/AsyncStorage
 * - Incompatible cached data from previous app versions
 * - Stale JWT tokens with different payload structures
 * 
 * Usage in App.tsx:
 * ```tsx
 * function App() {
 *   const { isChecking, needsUpdate } = useVersionCheck();
 *   
 *   if (isChecking) {
 *     return <LoadingScreen />;
 *   }
 *   
 *   // App will have clean cache at this point
 *   return <YourApp />;
 * }
 * ```
 */
export function useVersionCheck() {
  const [isChecking, setIsChecking] = useState(true);
  const [needsUpdate, setNeedsUpdate] = useState(false);

  useEffect(() => {
    checkAndUpdateVersion();
  }, []);

  const checkAndUpdateVersion = async () => {
    try {
      const storedVersion = await AsyncStorage.getItem(VERSION_KEY);

      // If no version stored or version mismatch, clear everything
      if (!storedVersion || storedVersion !== CURRENT_VERSION) {
        console.log(`[VersionCheck] Version mismatch. Stored: ${storedVersion}, Current: ${CURRENT_VERSION}`);
        console.log('[VersionCheck] Clearing all caches to prevent poisoned cache...');

        setNeedsUpdate(true);

        // Clear ALL AsyncStorage data
        await AsyncStorage.clear();

        // On Web, also clear browser caches (Service Worker, Cache API)
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          await clearBrowserCaches();
        }

        // Set the new version
        await AsyncStorage.setItem(VERSION_KEY, CURRENT_VERSION);

        console.log('[VersionCheck] ✅ Cache cleared successfully. Fresh start!');
      } else {
        console.log(`[VersionCheck] ✅ Version match: ${CURRENT_VERSION}`);
      }
    } catch (error) {
      console.error('[VersionCheck] ❌ Failed to check/update version:', error);
      // Don't block the app if version check fails
    } finally {
      setIsChecking(false);
    }
  };

  return {
    isChecking,
    needsUpdate,
    currentVersion: CURRENT_VERSION,
  };
}

/**
 * Force clear all cache and reset version
 * Useful for debugging or manual cache reset
 */
export async function forceClearCache(): Promise<void> {
  try {
    console.log('[VersionCheck] Force clearing all cache...');
    await AsyncStorage.clear();
    await AsyncStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    console.log('[VersionCheck] ✅ Cache force-cleared successfully');
  } catch (error) {
    console.error('[VersionCheck] ❌ Failed to force clear cache:', error);
    throw error;
  }
}

/**
 * Get current stored version
 */
export async function getStoredVersion(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(VERSION_KEY);
  } catch (error) {
    console.error('[VersionCheck] Failed to get stored version:', error);
    return null;
  }
}

/**
 * Clear browser-specific caches (Service Worker, Cache API)
 * This is needed on Web because JS code gets cached separately from AsyncStorage
 */
async function clearBrowserCaches(): Promise<void> {
  try {
    // 1. Unregister all Service Workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('[VersionCheck] Unregistered Service Worker:', registration.scope);
      }
    }

    // 2. Clear Cache API (used by Service Workers and some bundlers)
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log('[VersionCheck] Deleted cache:', cacheName);
      }
    }

    // 3. Clear localStorage (in case any stale data is there)
    if (typeof localStorage !== 'undefined') {
      // Keep the version key, clear everything else
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.includes(VERSION_KEY)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log('[VersionCheck] Cleared localStorage items:', keysToRemove.length);
    }

    console.log('[VersionCheck] ✅ Browser caches cleared');

    // 4. Force reload to get fresh JS bundles (after a brief delay to ensure storage is saved)
    console.log('[VersionCheck] Reloading to apply fresh code...');
    setTimeout(() => {
      window.location.reload();
    }, 100);
  } catch (error) {
    console.error('[VersionCheck] Failed to clear browser caches:', error);
  }
}
