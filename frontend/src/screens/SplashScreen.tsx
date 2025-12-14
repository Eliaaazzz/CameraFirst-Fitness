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
      try {
        const authenticated = await isAuthenticated();
        setIsChecking(false);

        if (authenticated) {
          // User is logged in, go to main app
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' } as any],
          });
        } else {
          // User is not logged in, go to login
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' } as any],
          });
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsChecking(false);
        // Fallback to login screen on error
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' } as any],
        });
      }
    };
	

    checkAuth();
  }, [navigation]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#2196F3" />
    </View>
  );
}
