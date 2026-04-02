import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import CuteAuraLogo from '@/components/common/CuteAuraLogo';
import { Text } from '@/components/Text';
import { useAppleCredentialCheck } from '@/hooks/useAppleCredentialCheck';
import { useAuthStore } from '@/stores';
import { BRAND_COLORS } from '@/utils';

/**
 * Splash/Loading screen with branded entrance animation.
 * Uses the CuteAuraLogo with fade+zoom entrance, brand gradient background,
 * and a custom pulsing loading indicator.
 */
export default function SplashScreen() {
  const navigation = useNavigation();
  const { isRestoringToken, isAuthenticated, restoreToken } = useAuthStore();
  const hasStartedRestoreRef = useRef(false);

  // Animation values
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const textOpacity = useSharedValue(0);
  const dotScale1 = useSharedValue(0.6);
  const dotScale2 = useSharedValue(0.6);
  const dotScale3 = useSharedValue(0.6);

  // Check Apple credential state after auth is restored (iOS only)
  useAppleCredentialCheck();

  useEffect(() => {
    // Logo entrance
    logoOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.back(1.2)) });

    // App name fade in
    textOpacity.value = withDelay(
      300,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );

    // Loading dots pulse
    const dotPulse = (delay: number) =>
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.6, { duration: 400, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        )
      );
    dotScale1.value = dotPulse(500);
    dotScale2.value = dotPulse(633);
    dotScale3.value = dotPulse(766);
  }, []);

  useEffect(() => {
    if (hasStartedRestoreRef.current) {
      return;
    }
    hasStartedRestoreRef.current = true;

    const initAuth = async () => {
      console.log('[SplashScreen] Starting auth restoration...');
      await restoreToken();
      console.log('[SplashScreen] Auth restoration complete');
    };

    // Small delay to ensure storage is ready
    const timer = setTimeout(initAuth, 500);

    return () => clearTimeout(timer);
  }, [restoreToken]);

  // Navigate once restoration is complete
  useEffect(() => {
    if (isRestoringToken) {
      return; // Still loading
    }

    console.log('[SplashScreen] Restoration done, isAuthenticated:', isAuthenticated);

    if (isAuthenticated) {
      console.log('[SplashScreen] User is authenticated, navigating to Main');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' } as any],
      });
    } else {
      console.log('[SplashScreen] User is NOT authenticated, navigating to Login');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' } as any],
      });
    }
  }, [isRestoringToken, isAuthenticated, navigation]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const dot1Style = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale1.value }],
    opacity: dotScale1.value,
  }));
  const dot2Style = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale2.value }],
    opacity: dotScale2.value,
  }));
  const dot3Style = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale3.value }],
    opacity: dotScale3.value,
  }));

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#FFFFFF', '#FFF9F2']}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <CuteAuraLogo size={120} variant="sparkle" />
      </Animated.View>

      <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
        <Text variant="heading2" weight="bold" style={styles.appName}>
          AuraFitness
        </Text>
        <Text variant="caption" style={styles.tagline}>
          Your wellness companion
        </Text>
      </Animated.View>

      {/* Custom loading dots */}
      <View style={styles.dotsContainer}>
        <Animated.View style={[styles.dot, { backgroundColor: BRAND_COLORS.primary }, dot1Style]} />
        <Animated.View style={[styles.dot, { backgroundColor: BRAND_COLORS.primaryDark }, dot2Style]} />
        <Animated.View style={[styles.dot, { backgroundColor: BRAND_COLORS.primary }, dot3Style]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 16,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  appName: {
    color: BRAND_COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    color: BRAND_COLORS.textMuted,
    marginTop: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 80 : 100,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
