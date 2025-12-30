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
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
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
import { saveJWT, getJWT } from '../utils/jwtStorage';

// Required for Web support and handling login redirect callbacks
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IOS_CLIENT_ID = EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

type AuthMode = 'login' | 'register';

export default function LoginScreen() {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  // Email/Password auth state
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Check if Apple auth is available on this device
  useEffect(() => {
    const checkAppleAuth = async () => {
      if (Platform.OS === 'web') {
        // Always show Apple button on web (Sign in with Apple JS will handle it)
        setAppleAuthAvailable(true);
      } else if (Platform.OS === 'ios') {
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

  const handleLoginSuccess = useCallback(async (data: { token: string; email: string; isNewUser?: boolean }) => {
    console.log('[LoginScreen] Login successful!');
    console.log('[LoginScreen] JWT received, length:', data.token?.length);

    // Clear any cached data from previous user before saving new JWT
    queryClient.clear();

    await saveJWT(data.token, undefined, data.email);

    // Verify the JWT was saved correctly
    const savedToken = await getJWT();
    if (!savedToken) {
      throw new Error('JWT was not saved correctly to storage');
    }

    // Small delay to ensure JWT is fully persisted before navigation
    await new Promise(resolve => setTimeout(resolve, 500));

    setIsLoading(false);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' } as any],
    });
  }, [navigation]);

  const sendTokenToBackend = useCallback(async (idToken: string) => {
    setIsLoading(true);
    try {
      console.log('[LoginScreen] Sending Google token to backend...');

      const data = await api.post<{ token: string; email: string; isNewUser?: boolean }>('/api/v1/auth/login', {
        loginType: 'GOOGLE',
        idToken: idToken,
      });

      await handleLoginSuccess(data);
    } catch (error) {
      setIsLoading(false);
      console.error('[LoginScreen] Backend validation failed:', error);
      Alert.alert(
        'Login Failed',
        error instanceof Error ? error.message : 'Unable to connect to Aura Fitness server. Please check your internet connection and try again.'
      );
    }
  }, [handleLoginSuccess]);

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

  const handleAppleLogin = async () => {
    // Web platform - Apple Sign In not yet implemented
    if (Platform.OS === 'web') {
      Alert.alert(
        'Coming Soon',
        'Apple Sign In on web is coming soon. Please use email/password or Google sign-in for now.'
      );
      return;
    }

    setIsLoading(true);
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

      console.log('[LoginScreen] Sending Apple token to backend...');

      const data = await api.post<{ token: string; email: string; isNewUser?: boolean }>('/api/v1/auth/login', {
        loginType: 'APPLE',
        idToken: identityToken,
        fullName: credential.fullName
          ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
          : undefined,
      });

      await handleLoginSuccess(data);
    } catch (error: any) {
      setIsLoading(false);
      if (error.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      console.error('Apple login failed:', error);
      Alert.alert(
        'Login Failed',
        error instanceof Error ? error.message : 'Apple sign-in failed. Please try again.'
      );
    }
  };

  const handleEmailAuth = async () => {
    // Validate inputs
    if (!email.trim() || !password) {
      Alert.alert('Missing Information', 'Please enter both email and password.');
      return;
    }

    if (authMode === 'register') {
      if (password !== confirmPassword) {
        Alert.alert('Password Mismatch', 'Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Weak Password', 'Password must be at least 6 characters.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const endpoint = authMode === 'register' ? '/api/v1/auth/register' : '/api/v1/auth/login';
      const body = authMode === 'register'
        ? { email: email.trim().toLowerCase(), password }
        : { loginType: 'EMAIL', email: email.trim().toLowerCase(), password };

      console.log(`[LoginScreen] ${authMode === 'register' ? 'Registering' : 'Logging in'} with email...`);

      const data = await api.post<{ token: string; email: string; isNewUser?: boolean }>(endpoint, body);

      if (authMode === 'register') {
        // Registration successful - show success and switch to login mode
        setIsLoading(false);
        Alert.alert(
          'Account Created',
          'Your account has been created successfully. Please sign in.',
          [{ text: 'OK', onPress: () => {
            setAuthMode('login');
            setPassword('');
            setConfirmPassword('');
          }}]
        );
      } else {
        // Login successful - proceed with login
        await handleLoginSuccess(data);
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error(`[LoginScreen] ${authMode} failed:`, error);

      let message = 'An error occurred. Please try again.';
      if (error?.message) {
        message = error.message;
      } else if (authMode === 'register') {
        message = 'Registration failed. Email may already be in use.';
      } else {
        message = 'Invalid email or password.';
      }

      Alert.alert(authMode === 'register' ? 'Registration Failed' : 'Login Failed', message);
    }
  };

  const toggleAuthMode = () => {
    setAuthMode(authMode === 'login' ? 'register' : 'login');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <SafeAreaWrapper>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <LinearGradient
          colors={[BRAND_COLORS.background, '#1A1025', BRAND_COLORS.background]}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
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
                {authMode === 'login'
                  ? 'Welcome back! Sign in to continue.'
                  : 'Create your account to get started.'}
              </Text>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
                <Text variant="body" style={styles.loadingText}>
                  {authMode === 'register' ? 'Creating your account...' : 'Signing you in...'}
                </Text>
              </View>
            ) : (
              <>
                {/* Email/Password Form */}
                <View style={styles.formContainer}>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="email-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      placeholderTextColor="#6B7280"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      textContentType="emailAddress"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="lock-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor="#6B7280"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      textContentType={authMode === 'register' ? 'newPassword' : 'password'}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                      <MaterialCommunityIcons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color="#9CA3AF"
                      />
                    </Pressable>
                  </View>

                  {authMode === 'register' && (
                    <View style={styles.inputContainer}>
                      <MaterialCommunityIcons name="lock-check-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Confirm Password"
                        placeholderTextColor="#6B7280"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showPassword}
                        textContentType="newPassword"
                      />
                    </View>
                  )}

                  {/* Email Auth Button */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.emailButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={handleEmailAuth}
                  >
                    <Text variant="body" weight="bold" style={styles.emailButtonText}>
                      {authMode === 'login' ? 'Sign In' : 'Create Account'}
                    </Text>
                  </Pressable>

                  {/* Toggle Auth Mode */}
                  <Pressable onPress={toggleAuthMode} style={styles.toggleButton}>
                    <Text variant="body" style={styles.toggleText}>
                      {authMode === 'login'
                        ? "Don't have an account? "
                        : 'Already have an account? '}
                      <Text weight="bold" style={styles.toggleTextBold}>
                        {authMode === 'login' ? 'Register' : 'Sign In'}
                      </Text>
                    </Text>
                  </Pressable>
                </View>

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text variant="caption" style={styles.dividerText}>or continue with</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Social Login Buttons */}
                <View style={styles.socialButtonContainer}>
                  {/* Google Login Button */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.socialButton,
                      styles.googleButton,
                      pressed && styles.buttonPressed,
                      !request && styles.buttonDisabled,
                    ]}
                    disabled={!request}
                    onPress={() => promptAsync(Platform.OS === 'web' ? { showInRecents: true } : undefined)}
                  >
                    <MaterialCommunityIcons name="google" size={24} color="#FFF" />
                    <Text variant="body" weight="bold" style={styles.socialButtonText}>
                      Continue with Google
                    </Text>
                  </Pressable>

                  {/* Apple Login Button */}
                  {appleAuthAvailable && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.socialButton,
                        styles.appleButton,
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={handleAppleLogin}
                    >
                      <MaterialCommunityIcons name="apple" size={24} color="#FFF" />
                      <Text variant="body" weight="bold" style={styles.socialButtonText}>
                        Continue with Apple
                      </Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <Text variant="caption" style={styles.footerText}>
                By continuing, you agree to our Terms of Service and Privacy Policy
              </Text>
            </View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
    paddingHorizontal: spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    opacity: 0.7,
  },
  formContainer: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputIcon: {
    marginLeft: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    fontSize: 16,
    color: '#FFF',
  },
  eyeIcon: {
    padding: spacing.md,
  },
  emailButton: {
    backgroundColor: BRAND_COLORS.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  emailButtonText: {
    color: '#1A1F2E',
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  toggleText: {
    opacity: 0.7,
  },
  toggleTextBold: {
    color: BRAND_COLORS.primary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    marginHorizontal: spacing.md,
    opacity: 0.5,
  },
  socialButtonContainer: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
  },
  appleButton: {
    backgroundColor: BRAND_COLORS.primaryDark,
  },
  googleButton: {
    backgroundColor: BRAND_COLORS.primary,
  },
  socialButtonText: {
    color: '#FFF',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    opacity: 0.4,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
