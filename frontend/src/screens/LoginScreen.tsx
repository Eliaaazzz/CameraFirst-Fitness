import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
} from '@env';
import { api } from '../services/apiClient';
import { queryClient } from '../services/queryClient';
import { saveJWT, getJWT } from '../utils/jwtStorage';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IOS_CLIENT_ID = EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// ============================================================================
// Design Tokens - iOS HIG Inspired
// ============================================================================
const TOKENS = {
  // Colors
  colors: {
    // Gradient background
    gradientStart: '#FBFAFF',
    gradientMid: '#EFE9FF',
    gradientEnd: '#E7DFFF',

    // Surfaces
    cardBg: '#FFFFFF',
    mobilePanelBg: 'rgba(255,255,255,0.92)',

    // Primary purple
    primary: '#7C3AED',
    primaryLight: '#A78BFA',
    primaryDisabled: '#C4B5FD',
    primaryContainer: '#F5F3FF',

    // Text
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    textOnPrimary: '#FFFFFF',

    // Input
    inputBg: '#FFFFFF',
    inputBorder: '#E5E7EB',
    inputBorderFocus: '#8B5CF6',
    inputIcon: '#9CA3AF',
    placeholder: '#9CA3AF',

    // Buttons
    googleBg: '#FFFFFF',
    googleBorder: '#E5E7EB',
    appleBg: '#111827',

    // Divider
    divider: '#E5E7EB',

    // Error
    errorBg: '#FEE2E2',
    errorText: '#991B1B',

    // Link
    link: '#7C3AED',
  },

  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
  },

  // Border radius
  radii: {
    input: 14,
    button: 16,
    card: 24,
    mobilePanel: 20,
    logoBadge: 32,
  },

  // Shadows
  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 12,
    },
    inputFocus: {
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.10,
      shadowRadius: 8,
      elevation: 2,
    },
    button: {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
  },

  // Typography
  typography: {
    title: {
      fontSize: 34,
      fontWeight: '700' as const,
      color: '#111827',
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 15,
      fontWeight: '400' as const,
      color: '#6B7280',
    },
    label: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: '#6B7280',
    },
    input: {
      fontSize: 16,
      fontWeight: '400' as const,
      color: '#111827',
    },
    button: {
      fontSize: 17,
      fontWeight: '600' as const,
    },
    link: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: '#7C3AED',
    },
    legal: {
      fontSize: 12,
      fontWeight: '400' as const,
      color: '#6B7280',
      lineHeight: 18,
    },
  },

  // Sizes
  sizes: {
    inputHeight: 52,
    buttonHeight: 54,
    logoBadge: 64,
    logoIcon: 28,
    inputIcon: 20,
  },

  // Breakpoints
  breakpoints: {
    desktop: 520,
  },
};

// ============================================================================
// Responsive Hook
// ============================================================================
const useResponsiveLayout = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= TOKENS.breakpoints.desktop;

  return {
    isDesktop,
    isMobile: !isDesktop,
    width,
  };
};

// ============================================================================
// Components
// ============================================================================

// Logo Badge Component
const LogoBadge = () => (
  <View style={styles.logoBadge}>
    <View style={styles.logoInnerCircle}>
      <MaterialCommunityIcons
        name="dumbbell"
        size={TOKENS.sizes.logoIcon}
        color={TOKENS.colors.primary}
      />
    </View>
  </View>
);

// Google G Icon (multi-color)
const GoogleIcon = () => (
  <View style={styles.googleIconContainer}>
    <Text style={styles.googleG}>
      <Text style={{ color: '#4285F4' }}>G</Text>
    </Text>
  </View>
);

// Input Field Component
interface InputFieldProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  showToggle?: boolean;
  onToggleSecure?: () => void;
  isSecureVisible?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address';
  textContentType?: 'emailAddress' | 'password' | 'newPassword';
  accessibilityLabel: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  showToggle = false,
  onToggleSecure,
  isSecureVisible = false,
  autoCapitalize = 'none',
  keyboardType = 'default',
  textContentType,
  accessibilityLabel,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
        ]}
      >
        <Ionicons
          name={icon}
          size={TOKENS.sizes.inputIcon}
          color={TOKENS.colors.inputIcon}
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={TOKENS.colors.placeholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={secureTextEntry && !isSecureVisible}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
          textContentType={textContentType}
          accessibilityLabel={accessibilityLabel}
        />
        {showToggle && (
          <Pressable
            onPress={onToggleSecure}
            style={styles.eyeButton}
            accessibilityLabel={isSecureVisible ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={isSecureVisible ? 'eye-off-outline' : 'eye-outline'}
              size={TOKENS.sizes.inputIcon}
              color={TOKENS.colors.inputIcon}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
};

// Error Message Component
const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorText}>{message}</Text>
  </View>
);

// ============================================================================
// Main Login Screen
// ============================================================================
export default function LoginScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsiveLayout();

  // Auth state
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  // Validation
  const isEmailValid = useMemo(() => {
    return email.trim().length > 0 && email.includes('@');
  }, [email]);

  const isPasswordValid = useMemo(() => {
    return password.length > 0;
  }, [password]);

  const isFormValid = isEmailValid && isPasswordValid;

  // Check Apple auth availability
  useEffect(() => {
    const checkAppleAuth = async () => {
      if (Platform.OS === 'web') {
        setAppleAuthAvailable(true);
      } else if (Platform.OS === 'ios') {
        try {
          const isAvailable = await AppleAuthentication.isAvailableAsync();
          setAppleAuthAvailable(isAvailable);
        } catch {
          setAppleAuthAvailable(true);
        }
      }
    };
    checkAppleAuth();
  }, []);

  // Google OAuth setup
  const redirectUri = Platform.OS === 'web'
    ? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081')
    : AuthSession.makeRedirectUri({ scheme: 'com.fitnessapp.mvp' });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri,
    scopes: ['profile', 'email'],
  });

  // Handle successful login
  const handleLoginSuccess = useCallback(async (data: { token: string; email: string; isNewUser?: boolean }) => {
    queryClient.clear();
    await saveJWT(data.token, undefined, data.email);
    const savedToken = await getJWT();
    if (!savedToken) {
      throw new Error('JWT was not saved correctly');
    }
    await new Promise(resolve => setTimeout(resolve, 500));
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
    if (Platform.OS === 'web') {
      setError('Apple Sign In on web is coming soon.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
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
        loginType: 'EMAIL',
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

  // Dismiss keyboard
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // Render form content
  const renderFormContent = () => (
    <>
      {/* Logo */}
      <LogoBadge />

      {/* Title */}
      <Text style={styles.title}>AuraFit</Text>
      <Text style={styles.subtitle}>Welcome back! Sign in to continue.</Text>

      {/* Error Message */}
      {error && <ErrorMessage message={error} />}

      {/* Email Input */}
      <InputField
        label="Email"
        icon="mail-outline"
        placeholder="name@example.com"
        value={email}
        onChangeText={(text) => { setEmail(text); setError(null); }}
        keyboardType="email-address"
        textContentType="emailAddress"
        accessibilityLabel="Email address input"
      />

      {/* Password Input */}
      <InputField
        label="Password"
        icon="lock-closed-outline"
        placeholder="••••••••"
        value={password}
        onChangeText={(text) => { setPassword(text); setError(null); }}
        secureTextEntry
        showToggle
        onToggleSecure={() => setShowPassword(!showPassword)}
        isSecureVisible={showPassword}
        textContentType="password"
        accessibilityLabel="Password input"
      />

      {/* Forgot Password */}
      <Pressable
        onPress={handleForgotPassword}
        style={styles.forgotPasswordContainer}
        accessibilityLabel="Forgot password"
      >
        <Text style={styles.forgotPasswordText}>Forgot password?</Text>
      </Pressable>

      {/* Sign In Button */}
      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          !isFormValid && styles.primaryButtonDisabled,
          pressed && isFormValid && !isLoading && styles.primaryButtonPressed,
        ]}
        onPress={handleEmailLogin}
        disabled={!isFormValid || isLoading}
        accessibilityLabel="Sign in"
        accessibilityState={{ disabled: !isFormValid || isLoading }}
      >
        {isLoading ? (
          <View style={styles.loadingContent}>
            <ActivityIndicator size="small" color={TOKENS.colors.textOnPrimary} />
            <Text style={styles.primaryButtonText}>Signing in...</Text>
          </View>
        ) : (
          <Text style={styles.primaryButtonText}>Sign In</Text>
        )}
      </Pressable>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Google Button */}
      <Pressable
        style={({ pressed }) => [
          styles.socialButton,
          styles.googleButton,
          pressed && styles.socialButtonPressed,
          !request && styles.buttonDisabled,
        ]}
        disabled={!request || isLoading}
        onPress={() => promptAsync(Platform.OS === 'web' ? { showInRecents: true } : undefined)}
        accessibilityLabel="Continue with Google"
      >
        <GoogleIcon />
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </Pressable>

      {/* Apple Button */}
      {appleAuthAvailable && (
        <Pressable
          style={({ pressed }) => [
            styles.socialButton,
            styles.appleButton,
            pressed && styles.socialButtonPressed,
          ]}
          onPress={handleAppleLogin}
          disabled={isLoading}
          accessibilityLabel="Continue with Apple"
        >
          <Ionicons name="logo-apple" size={20} color={TOKENS.colors.textOnPrimary} />
          <Text style={styles.appleButtonText}>Continue with Apple</Text>
        </Pressable>
      )}

      {/* Create Account */}
      <View style={styles.createAccountContainer}>
        <Text style={styles.createAccountText}>Don't have an account?  </Text>
        <Pressable onPress={handleCreateAccount} accessibilityLabel="Create account">
          <Text style={styles.createAccountLink}>Create account</Text>
        </Pressable>
      </View>

      {/* Legal */}
      <View style={styles.legalContainer}>
        <Text style={styles.legalText}>
          By continuing, you agree to our{' '}
          <Text style={styles.legalLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.legalLink}>Privacy Policy</Text>.
        </Text>
      </View>
    </>
  );

  return (
    <LinearGradient
      colors={[TOKENS.colors.gradientStart, TOKENS.colors.gradientMid, TOKENS.colors.gradientEnd]}
      style={styles.gradient}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {isDesktop ? (
              // Desktop: Centered card
              <View style={styles.desktopWrapper}>
                <View style={styles.card}>
                  {renderFormContent()}
                </View>
              </View>
            ) : (
              // Mobile: Panel layout
              <View style={styles.mobileWrapper}>
                <View style={styles.mobilePanel}>
                  {renderFormContent()}
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
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
  },

  // Desktop layout
  desktopWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: TOKENS.spacing.xl,
  },
  card: {
    width: '92%',
    maxWidth: 520,
    backgroundColor: TOKENS.colors.cardBg,
    borderRadius: TOKENS.radii.card,
    paddingHorizontal: 40,
    paddingVertical: 48,
    ...TOKENS.shadows.card,
  },

  // Mobile layout
  mobileWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: TOKENS.spacing.xl,
  },
  mobilePanel: {
    backgroundColor: TOKENS.colors.mobilePanelBg,
    borderRadius: TOKENS.radii.mobilePanel,
    padding: TOKENS.spacing.xl,
  },

  // Logo
  logoBadge: {
    alignSelf: 'center',
    width: TOKENS.sizes.logoBadge,
    height: TOKENS.sizes.logoBadge,
    borderRadius: TOKENS.radii.logoBadge,
    backgroundColor: TOKENS.colors.primaryContainer,
    borderWidth: 2,
    borderColor: TOKENS.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.lg,
  },
  logoInnerCircle: {
    width: TOKENS.sizes.logoBadge - 16,
    height: TOKENS.sizes.logoBadge - 16,
    borderRadius: (TOKENS.sizes.logoBadge - 16) / 2,
    backgroundColor: TOKENS.colors.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Typography
  title: {
    ...TOKENS.typography.title,
    textAlign: 'center',
    marginBottom: TOKENS.spacing.xs,
  },
  subtitle: {
    ...TOKENS.typography.subtitle,
    textAlign: 'center',
    marginBottom: TOKENS.spacing['2xl'],
  },

  // Error
  errorContainer: {
    backgroundColor: TOKENS.colors.errorBg,
    borderRadius: TOKENS.spacing.sm,
    padding: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.lg,
  },
  errorText: {
    color: TOKENS.colors.errorText,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Input
  fieldContainer: {
    marginBottom: TOKENS.spacing.md,
  },
  inputLabel: {
    ...TOKENS.typography.label,
    marginBottom: TOKENS.spacing.xs,
    marginLeft: TOKENS.spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TOKENS.sizes.inputHeight,
    backgroundColor: TOKENS.colors.inputBg,
    borderRadius: TOKENS.radii.input,
    borderWidth: 1,
    borderColor: TOKENS.colors.inputBorder,
  },
  inputContainerFocused: {
    borderColor: TOKENS.colors.inputBorderFocus,
    ...TOKENS.shadows.inputFocus,
  },
  inputIcon: {
    marginLeft: TOKENS.spacing.lg,
    marginRight: TOKENS.spacing.sm,
  },
  input: {
    flex: 1,
    height: '100%',
    ...TOKENS.typography.input,
    paddingRight: TOKENS.spacing.lg,
  },
  eyeButton: {
    padding: TOKENS.spacing.lg,
  },

  // Forgot password
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: TOKENS.spacing.xl,
    marginTop: -TOKENS.spacing.xs,
  },
  forgotPasswordText: {
    ...TOKENS.typography.link,
  },

  // Primary button
  primaryButton: {
    height: TOKENS.sizes.buttonHeight,
    backgroundColor: TOKENS.colors.primary,
    borderRadius: TOKENS.radii.button,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.lg,
    ...TOKENS.shadows.button,
  },
  primaryButtonDisabled: {
    backgroundColor: TOKENS.colors.primaryDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    ...TOKENS.typography.button,
    color: TOKENS.colors.textOnPrimary,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TOKENS.spacing.sm,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: TOKENS.spacing.lg + 2, // 18px
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: TOKENS.colors.divider,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '500',
    color: TOKENS.colors.textMuted,
    marginHorizontal: TOKENS.spacing.lg,
  },

  // Social buttons
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: TOKENS.sizes.buttonHeight,
    borderRadius: TOKENS.radii.button,
    marginBottom: TOKENS.spacing.md,
    gap: TOKENS.spacing.sm + 2,
  },
  socialButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  googleButton: {
    backgroundColor: TOKENS.colors.googleBg,
    borderWidth: 1,
    borderColor: TOKENS.colors.googleBorder,
  },
  googleButtonText: {
    ...TOKENS.typography.button,
    color: TOKENS.colors.textPrimary,
  },
  googleIconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleG: {
    fontSize: 18,
    fontWeight: '600',
  },
  appleButton: {
    backgroundColor: TOKENS.colors.appleBg,
  },
  appleButtonText: {
    ...TOKENS.typography.button,
    color: TOKENS.colors.textOnPrimary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Create account
  createAccountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: TOKENS.spacing.lg,
    marginBottom: TOKENS.spacing.xl,
  },
  createAccountText: {
    fontSize: 15,
    color: TOKENS.colors.textSecondary,
  },
  createAccountLink: {
    fontSize: 15,
    fontWeight: '600',
    color: TOKENS.colors.link,
  },

  // Legal
  legalContainer: {
    paddingHorizontal: TOKENS.spacing.sm,
  },
  legalText: {
    ...TOKENS.typography.legal,
    textAlign: 'center',
  },
  legalLink: {
    color: TOKENS.colors.link,
    fontWeight: '500',
  },
});
