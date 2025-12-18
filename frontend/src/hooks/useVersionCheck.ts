import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

// IMPORTANT: Increment this version whenever you change data structures in AsyncStorage
// This will force a clean slate for users upgrading from older versions
const CURRENT_VERSION = '1.0.0'; // Update this when making breaking changes
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
        console.log('[VersionCheck] Clearing all AsyncStorage to prevent poisoned cache...');
        
        setNeedsUpdate(true);
        
        // Clear ALL AsyncStorage data (except the version key)
        await AsyncStorage.clear();
        
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
