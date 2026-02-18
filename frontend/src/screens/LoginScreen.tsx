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
        }) => void;
        renderButton: (
          element: string | HTMLElement,
          options: {
            type?: 'sign in' | 'continue' | 'sign-up';
            color?: 'black' | 'white';
            border?: boolean;
            border_radius?: number;
            width?: number | string;
            height?: number | string;
            locale?: string;
          }
        ) => void;
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

const APPLE_WEB_BUTTON_ID = 'apple-signin-official-button';

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
  const [isAppleWebReady, setIsAppleWebReady] = useState(Platform.OS !== 'web');
  const shouldShowAppleButton = Platform.OS === 'ios' || Platform.OS === 'web';
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
    scheme: 'com.fitnessapp.mvp',
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

  const sendAppleTokenToBackend = useCallback(async (idToken: string, fullName?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.post<{ token: string; email: string; isNewUser?: boolean }>('/api/v1/auth/login', {
        loginType: 'APPLE',
        idToken,
        fullName,
      });
      await handleLoginSuccess(data);
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Apple sign-in failed. Please try again.');
    }
  }, [handleLoginSuccess]);

  // Handle Google OAuth response
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

  // Helpful for debugging `redirect_uri_mismatch` on web:
  // Logs the *exact* redirect_uri + client_id being sent to Google.
  const handleGoogleLogin = useCallback(async () => {
    if (!googleRequest) return;

    if (Platform.OS === 'web') {
      console.log('[GoogleAuth] redirectUri (computed):', redirectUri);
      const authUrl = googleRequest.url;
      if (authUrl) {
        try {
          const u = new URL(authUrl);
          console.log('[GoogleAuth] request params:', {
            clientId: u.searchParams.get('client_id'),
            redirectUri: u.searchParams.get('redirect_uri'),
            responseType: u.searchParams.get('response_type'),
          });
        } catch {
          console.log('[GoogleAuth] authUrl:', authUrl);
        }
      }
    }

    await promptGoogleAsync(Platform.OS === 'web' ? { showInRecents: true } : undefined);
  }, [googleRequest, promptGoogleAsync, redirectUri]);

  // Web Apple Sign-In: official JS SDK + official rendered button.
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const onSuccess = async (event: Event) => {
      const detail = (event as Event & {
        detail?: {
          authorization?: { id_token?: string };
          user?: {
            name?: {
              firstName?: string;
              lastName?: string;
            };
          };
        };
      }).detail;

      const identityToken = detail?.authorization?.id_token;
      if (!identityToken) {
        setError('No identity token received from Apple.');
        return;
      }

      let fullName: string | undefined;
      const firstName = detail?.user?.name?.firstName;
      const lastName = detail?.user?.name?.lastName;
      if (firstName || lastName) {
        fullName = `${firstName || ''} ${lastName || ''}`.trim() || undefined;
      }

      await sendAppleTokenToBackend(identityToken, fullName);
    };

    const onFailure = (event: Event) => {
      const detail = (event as Event & { detail?: { error?: string } }).detail;
      if (detail?.error === 'popup_closed_by_user') {
        return;
      }
      setError('Apple sign-in failed.');
    };

    const initAppleAuth = () => {
      if (!globalThis.window?.AppleID) return false;

      if (!APPLE_SERVICE_ID) {
        setIsAppleWebReady(false);
        console.warn('[AppleAuth] EXPO_PUBLIC_APPLE_SERVICE_ID is missing on web');
        return false;
      }

      const redirectURI = `${globalThis.window.location.origin}/auth/apple/callback`;
      globalThis.window.AppleID.auth.init({
        clientId: APPLE_SERVICE_ID,
        scope: 'email name',
        redirectURI,
        usePopup: true,
      });

      try {
        globalThis.window.AppleID.auth.renderButton(`#${APPLE_WEB_BUTTON_ID}`, {
          type: 'continue',
          color: 'black',
          border: false,
          border_radius: 12,
          width: '100%',
          height: 54,
        });
        setIsAppleWebReady(true);
      } catch (error) {
        console.warn('[AppleAuth] Failed to render official Apple button', error);
        setIsAppleWebReady(false);
      }

      return true;
    };

    document.addEventListener('AppleIDSignInOnSuccess', onSuccess as EventListener);
    document.addEventListener('AppleIDSignInOnFailure', onFailure as EventListener);

    if (initAppleAuth()) {
      return () => {
        document.removeEventListener('AppleIDSignInOnSuccess', onSuccess as EventListener);
        document.removeEventListener('AppleIDSignInOnFailure', onFailure as EventListener);
      };
    }

    if (typeof document === 'undefined') return;

    const existingScript = document.getElementById('apple-signin-script') as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', initAppleAuth, { once: true });
      return () => {
        document.removeEventListener('AppleIDSignInOnSuccess', onSuccess as EventListener);
        document.removeEventListener('AppleIDSignInOnFailure', onFailure as EventListener);
      };
    }

    const script = document.createElement('script');
    script.id = 'apple-signin-script';
    script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    script.async = true;
    script.onload = () => {
      if (!initAppleAuth()) {
        setIsAppleWebReady(false);
      }
    };
    script.onerror = () => {
      setIsAppleWebReady(false);
    };
    document.head.appendChild(script);

    return () => {
      document.removeEventListener('AppleIDSignInOnSuccess', onSuccess as EventListener);
      document.removeEventListener('AppleIDSignInOnFailure', onFailure as EventListener);
    };
  }, [sendAppleTokenToBackend]);

  // Handle Apple login (iOS native only)
  const handleAppleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (Platform.OS === 'web') {
        // Web flow uses Apple official button + event callbacks.
        setIsLoading(false);
        return;
      }

      // iOS: Use native Apple Authentication
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const identityToken = credential.identityToken;
      if (!identityToken) {
        throw new Error('No identity token received from Apple');
      }
      const fullName = credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : undefined;
      await sendAppleTokenToBackend(identityToken, fullName);
    } catch (err: any) {
      setIsLoading(false);
      if (err.code === 'ERR_REQUEST_CANCELED') {
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
                    isAppleWebReady ? (
                      <View style={styles.appleWebButtonHost}>
                        <View nativeID={APPLE_WEB_BUTTON_ID} style={styles.appleWebButton} />
                        {isLoading && <View pointerEvents="none" style={styles.appleWebButtonOverlay} />}
                      </View>
                    ) : (
                      <View style={styles.appleWebFallbackButton}>
                        <Ionicons name="logo-apple" size={20} color={COLORS.white} />
                        <Text style={[styles.socialButtonText, styles.whiteSocialButtonText]}>Continue with Apple</Text>
                      </View>
                    )
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
  appleWebButtonHost: {
    position: 'relative',
    height: 54,
    borderRadius: RADII.md,
    overflow: 'hidden',
  },
  appleWebButton: {
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
  appleWebButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    opacity: 0.2,
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
