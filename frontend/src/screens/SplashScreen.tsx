import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { isAuthenticated } from '../utils/jwtStorage';

/**
 * Splash/Loading screen that checks if user is authenticated
 * If yes, navigates to Main; if no, navigates to Login
 */
export default function SplashScreen() {
  const navigation = useNavigation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      console.log('[SplashScreen] 🔍 Starting authentication check...');
      try {
        const authenticated = await isAuthenticated();
        console.log('[SplashScreen] Authentication result:', authenticated);
        setIsChecking(false);

        if (authenticated) {
          console.log('[SplashScreen] ✅ User is authenticated, navigating to Main');
          // User is logged in, go to main app
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' } as any],
          });
        } else {
          console.log('[SplashScreen] ❌ User is NOT authenticated, navigating to Login');
          // User is not logged in, go to login
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' } as any],
          });
        }
      } catch (error) {
        console.error('[SplashScreen] ❌ Error checking authentication:', error);
        setIsChecking(false);
        // Fallback to login screen on error
        console.log('[SplashScreen] Falling back to Login screen due to error');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' } as any],
        });
      }
    };
	
    // Add a small delay to prevent flickering and ensure storage is ready
    console.log('[SplashScreen] Delaying auth check by 1000ms...');
    setTimeout(checkAuth, 1000);
  }, [navigation]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#2196F3" />
    </View>
  );
}
