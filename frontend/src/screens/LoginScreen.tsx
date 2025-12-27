import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { SafeAreaWrapper, Text } from '@/components';
import { BRAND_COLORS, spacing } from '@/utils';
import {
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
} from '@env';
import { api } from '../services/apiClient';
import { queryClient } from '../services/queryClient';
import { saveJWT } from '../utils/jwtStorage';

// Required for Web support and handling loginrect callbacks
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IOS_CLIENT_ID = EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export default function LoginScreen() {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  // Check if Apple auth is available on this device
  useEffect(() => {
    const checkAppleAuth = async () => {
      if (Platform.OS === 'ios') {
        try {
          const isAvailable = await AppleAuthentication.isAvailableAsync();
          console.log('[LoginScreen] Apple Sign In available:', isAvailable);
          setAppleAuthAvailable(isAvailable);
        } catch (error) {
          console.error('[LoginScreen] Failed to check Apple Sign In availability:', error);
          // On simulator or when API fails, assume available for testing
          setAppleAuthAvailable(true);
        }
      }
    };
    checkAppleAuth();
  }, []);

  if (!GOOGLE_WEB_CLIENT_ID) {
    console.error('[LoginScreen] Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID; update frontend/.env and restart Expo');
  }

  // Generate redirect URI for Google OAuth
  // For web: use current origin; for native: use app scheme
  const redirectUri = Platform.OS === 'web'
    ? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081')
    : AuthSession.makeRedirectUri({ scheme: 'com.fitnessapp.mvp' });

  console.log('[LoginScreen] Google OAuth redirectUri:', redirectUri);
  console.log('[LoginScreen] Google Client IDs', {
    ios: GOOGLE_IOS_CLIENT_ID,
    android: GOOGLE_ANDROID_CLIENT_ID,
    web: GOOGLE_WEB_CLIENT_ID,
  });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri, // Explicitly set redirect URI
    scopes: ['profile', 'email'],
  });

  const sendTokenToBackend = useCallback(async (idToken: string) => {
    setIsLoading(true);
    try {
      console.log('Sending token to backend...');

      const data = await api.post<{ token: string; refreshToken?: string; email: string }>('/api/v1/auth/login', {
        loginType: 'GOOGLE',
        idToken: idToken,
      });

      console.log('Login successful! JWT:', data.token);

      // Clear any cached data from previous user before saving new JWT
      queryClient.clear();

      await saveJWT(data.token, data.refreshToken, data.email);

      setIsLoading(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' } as any],
      });
    } catch (error) {
      setIsLoading(false);
      console.error('Backend validation failed:', error);
      Alert.alert(
        'Login Failed',
        error instanceof Error ? error.message : 'Unable to connect to Aura Fitness server. Please check your internet connection and try again.'
      );
    }
  }, [navigation]);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        sendTokenToBackend(id_token);
      }
    } else if (response?.type === 'error') {
      Alert.alert('Google Sign-In Error', response.error?.message || 'Please try again later.');
    }
  }, [response, sendTokenToBackend]);

  const handleMockLogin = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockToken = `mock_jwt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const mockRefreshToken = `mock_refresh_${Date.now()}`;
      const mockEmail = 'test@aurafitness.com';

      console.log('Mock login successful! Token:', mockToken);

      // Clear any cached data from previous user before saving new JWT
      queryClient.clear();

      await saveJWT(mockToken, mockRefreshToken, mockEmail);

      setIsLoading(false);

      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' } as any],
      });
    } catch (error) {
      setIsLoading(false);
      console.error('Mock login failed:', error);
      Alert.alert('Login Failed', 'Mock login failed. Please try again.');
    }
  };

  const handleAppleLogin = async () => {
    setIsLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Get the identity token from Apple
      const identityToken = credential.identityToken;
      if (!identityToken) {
        throw new Error('No identity token received from Apple');
      }

      console.log('Sending Apple token to backend...');

      const data = await api.post<{ token: string; refreshToken?: string; email: string }>('/api/v1/auth/login', {
        loginType: 'APPLE',
        idToken: identityToken,
        fullName: credential.fullName
          ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
          : undefined,
      });

      console.log('Apple login successful! JWT:', data.token);

      // Clear any cached data from previous user before saving new JWT
      queryClient.clear();

      await saveJWT(data.token, data.refreshToken, data.email);

      setIsLoading(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' } as any],
      });
    } catch (error: any) {
      setIsLoading(false);
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User canceled the sign-in
        return;
      }
      console.error('Apple login failed:', error);
      Alert.alert(
        'Login Failed',
        error instanceof Error ? error.message : 'Apple sign-in failed. Please try again.'
      );
    }
  };

  return (
    <SafeAreaWrapper>
      <LinearGradient
        colors={[BRAND_COLORS.background, '#1A1025', BRAND_COLORS.background]}
        style={styles.container}
      >
        {/* Logo and Title */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons name="dumbbell" size={48} color={BRAND_COLORS.primary} />
          </View>
          <Text variant="heading1" weight="bold" style={styles.title}>
            Aura Fitness
          </Text>
          <Text variant="body" style={styles.subtitle}>
            Track your nutrition and fitness goals with AI-powered insights
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <FeatureItem
            icon="camera"
            title="Snap & Track"
            description="Take a photo of your meal for instant nutrition analysis"
          />
          <FeatureItem
            icon="target"
            title="Personalized Goals"
            description="Get AI-generated fitness and nutrition targets"
          />
          <FeatureItem
            icon="chart-line"
            title="Track Progress"
            description="Monitor your daily intake and workout achievements"
          />
        </View>

        {/* Login Buttons */}
        <View style={styles.buttonContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
              <Text variant="body" style={styles.loadingText}>
                Signing you in...
              </Text>
            </View>
          ) : (
            <>
              {/* Apple Login Button (iOS only) */}
              {appleAuthAvailable && (
                <Pressable
                  style={({ pressed }) => [
                    styles.appleButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleAppleLogin}
                  disabled={isLoading}
                >
                  <MaterialCommunityIcons name="apple" size={24} color="#FFF" />
                  <Text variant="body" weight="bold" style={styles.appleButtonText}>
                    Continue with Apple
                  </Text>
                </Pressable>
              )}

              {/* Google Login Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.googleButton,
                  pressed && styles.buttonPressed,
                  !request && styles.buttonDisabled,
                ]}
                disabled={!request || isLoading}
                onPress={() => promptAsync(Platform.OS === 'web' ? { showInRecents: true } : undefined)}
              >
                <MaterialCommunityIcons name="google" size={24} color="#FFF" />
                <Text variant="body" weight="bold" style={styles.googleButtonText}>
                  Continue with Google
                </Text>
              </Pressable>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text variant="caption" style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Mock Login (Dev Only) */}
              {__DEV__ && (
                <Pressable
                  style={({ pressed }) => [
                    styles.mockButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleMockLogin}
                >
                  <MaterialCommunityIcons name="test-tube" size={20} color="#9CA3AF" />
                  <Text variant="body" style={styles.mockButtonText}>
                    Dev Login (Test Mode)
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text variant="caption" style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </LinearGradient>
    </SafeAreaWrapper>
  );
}

const FeatureItem = ({ icon, title, description }: { icon: string; title: string; description: string }) => (
  <View style={styles.featureItem}>
    <View style={styles.featureIcon}>
      <MaterialCommunityIcons name={icon as any} size={24} color={BRAND_COLORS.primary} />
    </View>
    <View style={styles.featureContent}>
      <Text variant="body" weight="semibold">{title}</Text>
      <Text variant="caption" style={styles.featureDescription}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: spacing['3xl'],
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
    paddingHorizontal: spacing.lg,
  },
  features: {
    gap: spacing.md,
    marginVertical: spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.surface,
    padding: spacing.md,
    borderRadius: 16,
    gap: spacing.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureDescription: {
    opacity: 0.6,
    marginTop: 2,
  },
  buttonContainer: {
    gap: spacing.md,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    opacity: 0.7,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    gap: spacing.sm,
  },
  appleButtonText: {
    color: '#FFF',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    gap: spacing.sm,
  },
  googleButtonText: {
    color: '#FFF',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    opacity: 0.5,
  },
  mockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.3)',
    gap: spacing.sm,
  },
  mockButtonText: {
    color: '#9CA3AF',
  },
  footer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  footerText: {
    opacity: 0.4,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
