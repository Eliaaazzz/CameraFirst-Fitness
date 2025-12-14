import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { isAuthenticated, clearJWT } from '@/utils/jwtStorage';
import { BRAND_COLORS } from '@/utils';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard component that checks JWT validity on mount
 * and redirects to login if expired or invalid.
 * This runs AFTER SplashScreen has already done initial auth check.
 * Purpose: Catch JWT expiration that happens while app is in memory.
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await isAuthenticated();
        
        if (!authenticated) {
          console.warn('[AuthGuard] JWT expired or invalid, redirecting to login');
          // Clear any stale data
          await clearJWT();
          // Use setTimeout to ensure navigation is safe
          setTimeout(() => {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Login' as never }],
              })
            );
          }, 100);
        }
      } catch (error) {
        console.error('[AuthGuard] Error checking authentication:', error);
        // On error, clear JWT and redirect to login
        await clearJWT();
        setTimeout(() => {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Login' as never }],
            })
          );
        }, 100);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [navigation]);

  if (isChecking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.background,
  },
});
