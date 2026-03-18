import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import {
  API_BASE_URL,
  EXPO_PUBLIC_APPLE_SERVICE_ID,
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
} from '@env';
import CuteAuraLogo, { type CuteAuraLogoVariant } from '../components/common/CuteAuraLogo';
import { api } from '../services/apiClient';
import { queryClient } from '../services/queryClient';
import { useAuthStore } from '../stores';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IOS_CLIENT_ID = EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const APPLE_SERVICE_ID = EXPO_PUBLIC_APPLE_SERVICE_ID || process.env.EXPO_PUBLIC_APPLE_SERVICE_ID;
const APPLE_API_BASE_URL = API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'https://aurafitness.org';
const LOGO_VARIANT: CuteAuraLogoVariant = 'sparkle';

// Debug: Log OAuth config status (not values) in development
if (__DEV__) {
  console.log('[OAuth] Config loaded:', {
    hasWebClientId: !!GOOGLE_WEB_CLIENT_ID,
    hasIosClientId: !!GOOGLE_IOS_CLIENT_ID,
    hasAndroidClientId: !!GOOGLE_ANDROID_CLIENT_ID,
    hasAppleServiceId: !!APPLE_SERVICE_ID,
    webClientIdPrefix: GOOGLE_WEB_CLIENT_ID?.substring(0, 12) + '...',
  });
}

// Declare AppleID type for Sign in with Apple JS
declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
          state?: string;
          nonce?: string;
          responseType?: string;
          responseMode?: string;
        }) => void;
        signIn: () => Promise<{
          authorization: {
            code: string;
            id_token: string;
            state?: string;
          };
          user?: {
            email?: string;
            name?: {
              firstName?: string;
              lastName?: string;
            };
          };
        }>;
      };
    };
  }
}

const APPLE_STATE_KEY = 'apple_signin_state';
const APPLE_NONCE_KEY = 'apple_signin_nonce';

type AppleWebSignInPayload = {
  authorization?: {
    code?: string;
    id_token?: string;
    state?: string;
  };
  user?: {
    email?: string;
    name?: {
      firstName?: string;
      lastName?: string;
    };
  };
};

const getAppleFullName = (payload?: AppleWebSignInPayload['user']): string | undefined => {
  const firstName = payload?.name?.firstName?.trim();
  const lastName = payload?.name?.lastName?.trim();
  if (!firstName && !lastName) {
    return undefined;
  }
  return `${firstName || ''} ${lastName || ''}`.trim() || undefined;
};

/**
 * Generate a cryptographically random string for state/nonce parameters.
 * Uses Web Crypto API (available in all modern browsers and React Native).
 */
const generateRandomString = (length = 32): string => {
  const array = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(array);
  } else {
    // Fallback for environments without crypto API
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * SHA-256 hash a string. Apple requires the nonce to be hashed before
 * passing it to the JS SDK; the raw nonce is sent to our backend for
 * verification against the hashed value in the id_token.
 */
const sha256 = async (input: string): Promise<string> => {
  if (typeof globalThis.crypto?.subtle?.digest === 'function') {
    const buffer = new TextEncoder().encode(input);
    const hash = await globalThis.crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback: return raw nonce (server-side hash check will be skipped)
  return input;
};

// ============================================================================
// Design Tokens - Modern Light Theme (Orange)
// ============================================================================
const COLORS = {
  // Brand - Orange
  brand50: '#FFF7ED', // Orange 50
  brand100: '#FFEDD5', // Orange 100
  brand500: '#F97316', // Orange 500
  brand600: '#EA580C', // Orange 600
  brand700: '#C2410C', // Orange 700

  // Surfaces
  white: '#FFFFFF',
  background: '#FFF7ED', // Main Background

  // Text
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // States
  error: '#EF4444',
  errorBg: '#FEE2E2',
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
};

const RADII = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
};

// ============================================================================
// Google Icon Component
// ============================================================================
const GoogleIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

// ============================================================================
// Social Button Component
// ============================================================================
interface SocialButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

const SocialButton: React.FC<SocialButtonProps> = ({ onPress, disabled }) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.socialButton,
        styles.googleButton,
        pressed && styles.socialButtonPressed,
        disabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <GoogleIcon />
      <Text style={styles.socialButtonText}>
        Continue with Google
      </Text>
    </Pressable>
  );
};

// ============================================================================
// Main Login Screen
// ============================================================================
export default function LoginScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Auth state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAppleNativeAvailable, setIsAppleNativeAvailable] = useState(Platform.OS !== 'ios');
  const shouldShowAppleButton = Platform.OS === 'web' || (Platform.OS === 'ios' && isAppleNativeAvailable);
  const legalBaseUrl = useMemo(() => {
    if (Platform.OS === 'web' && typeof globalThis.window !== 'undefined') {
      return globalThis.window.location.origin;
    }
    return 'https://aurafitness.org';
  }, []);

  // Google OAuth setup
  // Use AuthSession.makeRedirectUri() for all platforms to ensure consistency.
  // On Web, this defaults to the current origin (e.g., http://localhost:8081).
  // On Native, it uses the provided scheme.
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'com.elia.aurafit',
    preferLocalhost: true,
  });

  // Debug: Log the calculated redirectUri in development
  if (__DEV__) {
    console.log('[OAuth] Calculated redirectUri:', redirectUri);
    console.log('[OAuth] Platform:', Platform.OS);
  }

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri,
    scopes: ['profile', 'email'],
  });

  // Handle successful login - use Zustand store signIn
  const handleLoginSuccess = useCallback(async (data: { token: string; email: string; isNewUser?: boolean }) => {
    // Clear React Query cache
    queryClient.clear();

    // Sign in via Zustand store (handles token storage + user info fetch)
    await useAuthStore.getState().signIn(data.token, {
      userId: '', // Will be populated by /api/v1/me call in signIn
      email: data.email,
      username: '', // Will be populated by /api/v1/me call
      currentStreak: 0, // Will be populated by /api/v1/me call
      level: '',
      timeBucket: 0,
    });

    setIsLoading(false);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' } as any],
    });
  }, [navigation]);

  // Send Google token to backend
  const sendGoogleTokenToBackend = useCallback(async (idToken: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.post<{ token: string; email: string; isNewUser?: boolean }>('/api/v1/auth/login', {
        loginType: 'GOOGLE',
        idToken,
      });
      await handleLoginSuccess(data);
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
    }
  }, [handleLoginSuccess]);

  const sendAppleTokenToBackend = useCallback(async (idToken: string, fullName?: string, nonce?: string, authorizationCode?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.post<{ token: string; email: string; isNewUser?: boolean }>('/api/v1/auth/login', {
        loginType: 'APPLE',
        idToken,
        fullName,
        ...(nonce ? { nonce } : {}),
        ...(authorizationCode ? { authorizationCode } : {}),
      });
      await handleLoginSuccess(data);
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Apple sign-in failed. Please try again.');
    }
  }, [handleLoginSuccess]);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    let cancelled = false;

    AppleAuthentication.isAvailableAsync()
      .then((isAvailable) => {
        if (!cancelled) {
          setIsAppleNativeAvailable(isAvailable);
        }
      })
      .catch((availabilityError) => {
        console.warn('[AppleAuth] Failed to detect native Apple Sign In availability', availabilityError);
        if (!cancelled) {
          setIsAppleNativeAvailable(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Handle Google OAuth response (popup flow — works on non-Safari browsers)
  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { id_token } = googleResponse.params;
      if (id_token) {
        sendGoogleTokenToBackend(id_token);
      }
    } else if (googleResponse?.type === 'error') {
      setError(googleResponse.error?.message || 'Google sign-in failed.');
    }
  }, [googleResponse, sendGoogleTokenToBackend]);

  // Handle Google OAuth redirect response (full-page redirect flow for Safari).
  // After window.location.href redirect, the page reloads with id_token in the
  // URL hash. expo-auth-session's popup flow can't process this, so we handle
  // it manually.
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;

    const params = new URLSearchParams(hash.substring(1));
    const idToken = params.get('id_token');

    if (!idToken) return;

    // Verify state to prevent CSRF
    const expectedState = sessionStorage.getItem('google_oauth_state');
    const receivedState = params.get('state');
    if (expectedState && receivedState && expectedState !== receivedState) {
      setError('Google sign-in verification failed. Please try again.');
      window.history.replaceState(null, '', window.location.pathname);
      sessionStorage.removeItem('google_oauth_state');
      return;
    }
    sessionStorage.removeItem('google_oauth_state');

    // Clean up URL to prevent re-processing on subsequent renders
    window.history.replaceState(null, '', window.location.pathname);

    sendGoogleTokenToBackend(idToken);
  }, [sendGoogleTokenToBackend]);

  const handleGoogleLogin = useCallback(async () => {
    if (!googleRequest?.url) return;

    if (Platform.OS === 'web') {
      // Safari blocks window.open() called from async functions.
      // Use a full-page redirect instead and manually handle the response
      // from the URL hash when the page reloads (see useEffect above).
      sessionStorage.setItem('google_oauth_state', googleRequest.state ?? '');
      window.location.href = googleRequest.url;
      return;
    }

    await promptGoogleAsync();
  }, [googleRequest, promptGoogleAsync]);

  const handleAppleWebSuccess = useCallback(async (payload?: AppleWebSignInPayload) => {
    const identityToken = payload?.authorization?.id_token;
    if (!identityToken) {
      setIsLoading(false);
      setError('No identity token received from Apple.');
      return;
    }

    // Verify state parameter to prevent CSRF attacks
    if (Platform.OS === 'web') {
      const expectedState = sessionStorage.getItem(APPLE_STATE_KEY);
      const receivedState = payload?.authorization?.state;
      if (expectedState && receivedState && expectedState !== receivedState) {
        setIsLoading(false);
        setError('Sign-in verification failed. Please try again.');
        return;
      }
      // Retrieve raw nonce to send to backend for verification
      const rawNonce = sessionStorage.getItem(APPLE_NONCE_KEY) ?? undefined;
      sessionStorage.removeItem(APPLE_STATE_KEY);
      sessionStorage.removeItem(APPLE_NONCE_KEY);
      const authCode = payload?.authorization?.code ?? undefined;
      await sendAppleTokenToBackend(identityToken, getAppleFullName(payload?.user), rawNonce, authCode);
      return;
    }

    const authCode = payload?.authorization?.code ?? undefined;
    await sendAppleTokenToBackend(identityToken, getAppleFullName(payload?.user), undefined, authCode);
  }, [sendAppleTokenToBackend]);

  // Web Apple Sign-In: load JS SDK and init auth for popup flow.
  // We use our own custom button (not Apple's renderButton) to avoid DOM timing issues.
  // The signIn() Promise handles the response directly.
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const initAppleAuth = async () => {
      if (!globalThis.window?.AppleID) return false;

      if (!APPLE_SERVICE_ID) {
        console.warn('[AppleAuth] EXPO_PUBLIC_APPLE_SERVICE_ID is missing on web');
        return false;
      }

      // Generate CSRF state and nonce for replay-attack prevention per Apple's guidelines
      const state = generateRandomString(32);
      const rawNonce = generateRandomString(32);
      const hashedNonce = await sha256(rawNonce);

      // Store raw values for verification when response arrives
      sessionStorage.setItem(APPLE_STATE_KEY, state);
      sessionStorage.setItem(APPLE_NONCE_KEY, rawNonce);

      // redirectURI must be registered in Apple Developer Console.
      // With usePopup: true, Apple communicates via postMessage (no actual redirect).
      const apiBase = APPLE_API_BASE_URL.replace(/\/+$/, '');
      const redirectURI = `${apiBase}/api/v1/auth/apple/callback`;
      globalThis.window.AppleID.auth.init({
        clientId: APPLE_SERVICE_ID,
        scope: 'email name',
        redirectURI,
        usePopup: true,
        state,
        nonce: hashedNonce,
        responseType: 'code id_token',
      });

      return true;
    };

    // Try to initialise immediately (SDK may already be loaded)
    void initAppleAuth().then((ok) => {
      if (ok) return;

      if (typeof document === 'undefined') return;

      const existingScript = document.getElementById('apple-signin-script') as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener('load', () => void initAppleAuth(), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.id = 'apple-signin-script';
      script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
      script.async = true;
      script.onload = () => void initAppleAuth();
      document.head.appendChild(script);
    });
  }, []);

  // Handle Apple login (iOS native only)
  const handleAppleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (Platform.OS === 'web') {
        if (!APPLE_SERVICE_ID) {
          setIsLoading(false);
          setError('Apple sign-in is not configured for web yet.');
          return;
        }

        if (!globalThis.window?.AppleID?.auth) {
          setIsLoading(false);
          setError('Apple sign-in is still loading. Please try again.');
          return;
        }

        const webResult = await globalThis.window.AppleID.auth.signIn();
        await handleAppleWebSuccess(webResult);
        return;
      }

      // iOS: Use native Apple Authentication with nonce for replay-attack prevention
      const rawNonce = generateRandomString(32);
      const hashedNonce = await sha256(rawNonce);

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      const identityToken = credential.identityToken;
      if (!identityToken) {
        throw new Error('No identity token received from Apple');
      }
      const fullName = credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : undefined;
      const authCode = credential.authorizationCode ?? undefined;
      await sendAppleTokenToBackend(identityToken, fullName, rawNonce, authCode);
    } catch (err: any) {
      setIsLoading(false);
      if (err?.code === 'ERR_REQUEST_CANCELED' || err?.error === 'popup_closed_by_user') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Apple sign-in failed.');
    }
  };

  // Handle tap outside inputs to dismiss keyboard (only on native)
  const handleOutsideTap = useCallback(() => {
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
  }, []);

  const openLegalPage = useCallback(async (path: 'terms-of-service.html' | 'privacy-policy.html') => {
    try {
      setError(null);
      await Linking.openURL(`${legalBaseUrl}/${path}`);
    } catch {
      setError('Unable to open legal page. Please try again later.');
    }
  }, [legalBaseUrl]);

  const handleOpenTerms = useCallback(() => {
    openLegalPage('terms-of-service.html');
  }, [openLegalPage]);

  const handleOpenPrivacy = useCallback(() => {
    openLegalPage('privacy-policy.html');
  }, [openLegalPage]);

  return (
    <LinearGradient
      colors={[COLORS.brand50, COLORS.brand50, COLORS.white]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + SPACING.xl, paddingBottom: insets.bottom + SPACING.xl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={handleOutsideTap}
        >
            <View style={styles.card}>
              {/* Logo Section */}
              <View style={styles.logoSection}>
                <CuteAuraLogo size={116} variant={LOGO_VARIANT} />
                <Text style={styles.title}>AuraFit</Text>
                <Text style={styles.subtitle}>Continue with Apple or Google.</Text>
              </View>

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Social Login */}
              <View style={styles.socialSection}>
                <View style={styles.authSectionHeader}>
                  <Text style={styles.authSectionTitle}>Sign in to continue</Text>
                  <Text style={styles.authSectionSubtitle}>Use your Apple or Google account</Text>
                </View>
                <View style={styles.socialButtonsStack}>
                  {shouldShowAppleButton && Platform.OS === 'ios' && (
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                      cornerRadius={RADII.md}
                      style={styles.appleNativeButton}
                      onPress={handleAppleLogin}
                    />
                  )}
                  {shouldShowAppleButton && Platform.OS === 'web' && (
                    <Pressable
                      onPress={handleAppleLogin}
                      disabled={isLoading}
                      style={({ pressed }) => [
                        styles.appleWebFallbackButton,
                        pressed && styles.socialButtonPressed,
                        isLoading && styles.buttonDisabled,
                      ]}
                    >
                      <Ionicons name="logo-apple" size={20} color={COLORS.white} />
                      <Text style={[styles.socialButtonText, styles.whiteSocialButtonText]}>Continue with Apple</Text>
                    </Pressable>
                  )}
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  <SocialButton
                    onPress={handleGoogleLogin}
                    disabled={!googleRequest || isLoading}
                  />
                </View>
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.legalText}>
                  By continuing, you agree to our{' '}
                  <Text style={styles.legalLink} onPress={handleOpenTerms}>Terms of Service</Text> and{' '}
                  <Text style={styles.legalLink} onPress={handleOpenPrivacy}>Privacy Policy</Text>.
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// ============================================================================
// Styles
// ============================================================================
const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING['2xl'],
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADII.lg,
    paddingHorizontal: SPACING['2xl'],
    paddingVertical: SPACING['4xl'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 14,
    borderWidth: 1,
    borderColor: COLORS.brand100,
    maxWidth: 390,
    minHeight: Platform.OS === 'web' ? 640 : undefined,
    width: '100%',
    justifyContent: 'space-between' as const,
  },

  // Logo Section
  logoSection: {
    alignItems: 'center',
    marginBottom: SPACING['3xl'],
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: COLORS.gray900,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Error
  errorContainer: {
    backgroundColor: COLORS.errorBg,
    borderRadius: RADII.sm,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Form Section
  formSection: {
    gap: SPACING.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    height: 48,
  },
  inputContainerFocused: {
    borderColor: COLORS.brand500,
    backgroundColor: COLORS.white,
  },
  inputIconContainer: {
    paddingLeft: SPACING.md,
    paddingRight: SPACING.sm,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: COLORS.gray800,
  },
  eyeButton: {
    padding: SPACING.md,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: -SPACING.sm,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.brand600,
  },
  signInButton: {
    backgroundColor: COLORS.brand500,
    borderRadius: RADII.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.brand500,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signInButtonDisabled: {
    backgroundColor: COLORS.gray400,
    shadowOpacity: 0,
    elevation: 0,
  },
  signInButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  signInButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray100,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.gray400,
    marginHorizontal: SPACING.lg,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Social Section
  socialSection: {
    gap: SPACING.lg,
    minHeight: 220,
    justifyContent: 'center',
  },
  socialButtonsStack: {
    gap: SPACING.sm,
  },
  authSectionHeader: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  authSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  authSectionSubtitle: {
    fontSize: 13,
    color: COLORS.gray500,
    textAlign: 'center',
  },
  appleNativeButton: {
    width: '100%',
    height: 54,
  },
  appleWebFallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    height: 54,
    borderRadius: RADII.md,
    backgroundColor: '#000000',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: RADII.md,
    gap: SPACING.md,
  },
  socialButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  googleButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray700,
  },
  whiteSocialButtonText: {
    color: COLORS.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Footer
  footer: {
    marginTop: SPACING['3xl'],
    alignItems: 'center',
    gap: SPACING.lg,
  },
  signUpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.brand600,
  },
  legalText: {
    fontSize: 12,
    color: COLORS.gray400,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: SPACING.lg,
  },
  legalLink: {
    color: COLORS.brand600,
    textDecorationLine: 'underline',
  },
});
