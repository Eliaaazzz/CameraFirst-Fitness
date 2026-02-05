import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { api } from '../services/apiClient';
import { queryClient } from '../services/queryClient';
import { useAuthStore } from '../stores';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IOS_CLIENT_ID = EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const APPLE_SERVICE_ID = EXPO_PUBLIC_APPLE_SERVICE_ID || process.env.EXPO_PUBLIC_APPLE_SERVICE_ID;

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

// ============================================================================
// Design Tokens - Modern Light Theme
// ============================================================================
const COLORS = {
  // Brand
  brand50: '#F3E8FF', // Light Lavender
  brand100: '#E9D5FF',
  brand500: '#8B5CF6',
  brand600: '#7C3AED', // Primary Purple
  brand700: '#6D28D9',

  // Surfaces
  white: '#FFFFFF',
  background: '#F3E8FF', // Main Background

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
// AuraFit Logo Component
// ============================================================================
const AuraFitLogo = ({ size = 150 }: { size?: number }) => (
  <Image
    source={require('../../assets/logo.png')}
    style={{ width: size, height: size }}
    resizeMode="contain"
  />
);

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
// Input Field Component
// ============================================================================
interface InputFieldProps {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  showToggle?: boolean;
  onToggleSecure?: () => void;
  isSecureVisible?: boolean;
  keyboardType?: 'default' | 'email-address';
  textContentType?: 'emailAddress' | 'password' | 'newPassword';
}

const InputField: React.FC<InputFieldProps> = ({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  showToggle = false,
  onToggleSecure,
  isSecureVisible = false,
  keyboardType = 'default',
  textContentType,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
      <View style={styles.inputIconContainer}>
        <Ionicons name={icon} size={20} color={COLORS.gray400} />
      </View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.gray400}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        secureTextEntry={secureTextEntry && !isSecureVisible}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType}
        textContentType={textContentType}
      />
      {showToggle && (
        <Pressable onPress={onToggleSecure} style={styles.eyeButton}>
          <Ionicons
            name={isSecureVisible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={COLORS.gray400}
          />
        </Pressable>
      )}
    </View>
  );
};

// ============================================================================
// Social Button Component
// ============================================================================
interface SocialButtonProps {
  provider: 'google' | 'apple';
  onPress: () => void;
  disabled?: boolean;
}

const SocialButton: React.FC<SocialButtonProps> = ({ provider, onPress, disabled }) => {
  const isGoogle = provider === 'google';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.socialButton,
        isGoogle ? styles.googleButton : styles.appleButton,
        pressed && styles.socialButtonPressed,
        disabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {isGoogle ? (
        <GoogleIcon />
      ) : (
        <Ionicons name="logo-apple" size={20} color={COLORS.white} />
      )}
      <Text style={[styles.socialButtonText, !isGoogle && styles.appleButtonText]}>
        Continue with {isGoogle ? 'Google' : 'Apple'}
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // iOS: always show Apple button (actual sign-in will error gracefully if unavailable)
  // Web: only show if Service ID is configured and JS SDK loads.
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(Platform.OS === 'ios');

  // Validation
  const isEmailValid = useMemo(() => {
    return email.trim().length > 0 && email.includes('@');
  }, [email]);

  const isPasswordValid = useMemo(() => {
    return password.length > 0;
  }, [password]);

  const isFormValid = isEmailValid && isPasswordValid;

  // Check Apple auth availability and load Apple JS SDK on web
  useEffect(() => {
    const checkAppleAuth = async () => {
      if (Platform.OS === 'web') {
        // Load Apple Sign In JS SDK for web
        if (APPLE_SERVICE_ID && typeof document !== 'undefined' && !document.getElementById('apple-signin-script')) {
          const script = document.createElement('script');
          script.id = 'apple-signin-script';
          script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
          script.async = true;
          script.onload = () => {
            if (globalThis.window?.AppleID) {
              const redirectURI = globalThis.window.location.origin + '/auth/apple/callback';
              globalThis.window.AppleID.auth.init({
                clientId: APPLE_SERVICE_ID,
                scope: 'email name',
                redirectURI,
                usePopup: true,
              });
              setAppleAuthAvailable(true);
            }
          };
          document.head.appendChild(script);
        } else if (!APPLE_SERVICE_ID) {
          // No Apple Service ID configured
          setAppleAuthAvailable(false);
        }
      } else if (Platform.OS === 'ios') {
        setAppleAuthAvailable(true);
      }
    };
    checkAppleAuth();
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

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
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
  const sendTokenToBackend = useCallback(async (idToken: string) => {
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

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        sendTokenToBackend(id_token);
      }
    } else if (response?.type === 'error') {
      setError(response.error?.message || 'Google sign-in failed.');
    }
  }, [response, sendTokenToBackend]);

  // Handle Apple login
  const handleAppleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (Platform.OS === 'web') {
        // Web: Use Apple Sign In JS SDK
        if (!globalThis.window?.AppleID) {
          throw new Error('Apple Sign In is not available. Please try again later.');
        }

        const response = await globalThis.window.AppleID.auth.signIn();
        const identityToken = response.authorization.id_token;

        if (!identityToken) {
          throw new Error('No identity token received from Apple');
        }

        // Build full name from user info (only provided on first sign in)
        let fullName: string | undefined;
        if (response.user?.name) {
          const { firstName, lastName } = response.user.name;
          fullName = `${firstName || ''} ${lastName || ''}`.trim() || undefined;
        }

        const data = await api.post<{ token: string; email: string; isNewUser?: boolean }>('/api/v1/auth/login', {
          loginType: 'APPLE',
          idToken: identityToken,
          fullName,
        });

        await handleLoginSuccess(data);
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

      const data = await api.post<{ token: string; email: string; isNewUser?: boolean }>('/api/v1/auth/login', {
        loginType: 'APPLE',
        idToken: identityToken,
        fullName: credential.fullName
          ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
          : undefined,
      });

      await handleLoginSuccess(data);
    } catch (err: any) {
      setIsLoading(false);
      if (err.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Apple sign-in failed.');
    }
  };

  // Handle email/password login
  const handleEmailLogin = async () => {
    if (!isFormValid) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await api.post<{ token: string; email: string; isNewUser?: boolean }>('/api/v1/auth/login', {
        loginType: 'LOCAL',
        email: email.trim().toLowerCase(),
        password,
      });
      await handleLoginSuccess(data);
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Invalid email or password.');
    }
  };

  // Navigation handlers
  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword' as never);
  };

  const handleCreateAccount = () => {
    navigation.navigate('Register' as never);
  };

  // Handle tap outside inputs to dismiss keyboard (only on native)
  const handleOutsideTap = useCallback(() => {
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
  }, []);

  return (
    <LinearGradient
      colors={['#F3E8FF', '#F3E8FF', '#FFFFFF']}
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
                <AuraFitLogo size={112} />
                <Text style={styles.title}>AuraFit</Text>
                <Text style={styles.subtitle}>Welcome back! Sign in to continue.</Text>
              </View>

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Form Section */}
              <View style={styles.formSection}>
                <InputField
                  icon="mail-outline"
                  placeholder="Email address"
                  value={email}
                  onChangeText={(text) => { setEmail(text); setError(null); }}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />

                <InputField
                  icon="lock-closed-outline"
                  placeholder="Password"
                  value={password}
                  onChangeText={(text) => { setPassword(text); setError(null); }}
                  secureTextEntry
                  showToggle
                  onToggleSecure={() => setShowPassword(!showPassword)}
                  isSecureVisible={showPassword}
                  textContentType="password"
                />

                <Pressable onPress={handleForgotPassword} style={styles.forgotPasswordContainer}>
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.signInButton,
                    !isFormValid && styles.signInButtonDisabled,
                    pressed && isFormValid && !isLoading && styles.signInButtonPressed,
                  ]}
                  onPress={handleEmailLogin}
                  disabled={!isFormValid || isLoading}
                >
                  {isLoading ? (
                    <View style={styles.loadingContent}>
                      <ActivityIndicator size="small" color={COLORS.white} />
                      <Text style={styles.signInButtonText}>Signing in...</Text>
                    </View>
                  ) : (
                    <Text style={styles.signInButtonText}>Sign In</Text>
                  )}
                </Pressable>
              </View>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Login */}
              <View style={styles.socialSection}>
                <SocialButton
                  provider="google"
                  onPress={() => promptAsync(Platform.OS === 'web' ? { showInRecents: true } : undefined)}
                  disabled={!request || isLoading}
                />
                {appleAuthAvailable && (
                  <SocialButton
                    provider="apple"
                    onPress={handleAppleLogin}
                    disabled={isLoading}
                  />
                )}
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <View style={styles.signUpContainer}>
                  <Text style={styles.signUpText}>Don't have an account? </Text>
                  <Pressable onPress={handleCreateAccount}>
                    <Text style={styles.signUpLink}>Sign up</Text>
                  </Pressable>
                </View>

                <Text style={styles.legalText}>
                  By continuing, you agree to our{' '}
                  <Text style={styles.legalLink}>Terms of Service</Text> and{' '}
                  <Text style={styles.legalLink}>Privacy Policy</Text>.
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
    paddingHorizontal: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADII.xl,
    paddingHorizontal: SPACING['2xl'],
    paddingVertical: SPACING['3xl'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
    maxWidth: 420,
    width: '100%',
  },

  // Logo Section
  logoSection: {
    alignItems: 'center',
    marginBottom: SPACING['2xl'],
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.gray900,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray500,
    textAlign: 'center',
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
    backgroundColor: '#8B5CF6',
    borderRadius: RADII.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
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
    marginVertical: SPACING['2xl'],
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
    gap: SPACING.md,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
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
  appleButton: {
    backgroundColor: '#000000',
    shadowColor: COLORS.gray400,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray700,
  },
  appleButtonText: {
    color: COLORS.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Footer
  footer: {
    marginTop: SPACING['2xl'],
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
  },
});
