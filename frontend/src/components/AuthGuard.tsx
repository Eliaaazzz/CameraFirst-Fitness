import { BRAND_COLORS } from '@/utils';
import { clearJWT, isAuthenticated } from '@/utils/jwtStorage';
import { CommonActions, useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

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
  const unauthenticatedRoute = Platform.OS === 'web' ? 'Landing' : 'Login';

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
                routes: [{ name: unauthenticatedRoute as never }],
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
              routes: [{ name: unauthenticatedRoute as never }],
            })
          );
        }, 100);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [navigation, unauthenticatedRoute]);

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
