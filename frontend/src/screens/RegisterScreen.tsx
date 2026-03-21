import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useState } from 'react';
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
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CuteAuraLogo, { type CuteAuraLogoVariant } from '../components/common/CuteAuraLogo';
import { api } from '../services/apiClient';
import { useAuthStore } from '../stores';
import { queryClient } from '../services/queryClient';
const LOGO_VARIANT: CuteAuraLogoVariant = 'sparkle';

// ============================================================================
// Design Tokens - Orange Theme
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
// Register Screen
// ============================================================================
export default function RegisterScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Auth state
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation
  const isEmailValid = useMemo(() => {
    return email.trim().length > 0 && email.includes('@');
  }, [email]);

  const isPasswordValid = useMemo(() => {
    return password.length >= 8;
  }, [password]);

  const doPasswordsMatch = useMemo(() => {
    return password === confirmPassword;
  }, [password, confirmPassword]);

  const isFormValid = isEmailValid && isPasswordValid && doPasswordsMatch;

  // Handle registration
  const handleRegister = async () => {
    if (!isFormValid) return;

    setIsLoading(true);
    setError(null);
    try {
      // 1. Register
      const authResult = await api.post<{ token: string; email: string; isNewUser?: boolean }>('/api/v1/auth/register', {
        email: email.trim().toLowerCase(),
        password,
      });

      // 2. Clear cache & Sign In locally
      queryClient.clear();
      await useAuthStore.getState().signIn(authResult.token, {
        userId: '',
        email: authResult.email,
        username: '',
        currentStreak: 0,
        level: 'beginner',
        timeBucket: 0,
      });

      setIsLoading(false);
      // Navigate to Main
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' } as any],
      });
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    }
  };

  const handleSignIn = () => {
    navigation.goBack();
  };

  // Handle tap outside inputs to dismiss keyboard (only on native)
  const handleOutsideTap = useCallback(() => {
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
  }, []);

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
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join FitnessMind today!</Text>
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
                placeholder="Password (min 8 chars)"
                value={password}
                onChangeText={(text) => { setPassword(text); setError(null); }}
                secureTextEntry
                showToggle
                onToggleSecure={() => setShowPassword(!showPassword)}
                isSecureVisible={showPassword}
                textContentType="newPassword"
              />

              <InputField
                icon="lock-closed-outline"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={(text) => { setConfirmPassword(text); setError(null); }}
                secureTextEntry
                showToggle
                onToggleSecure={() => setShowConfirmPassword(!showConfirmPassword)}
                isSecureVisible={showConfirmPassword}
                textContentType="newPassword"
              />

              <Pressable
                style={({ pressed }) => [
                  styles.registerButton,
                  !isFormValid && styles.registerButtonDisabled,
                  pressed && isFormValid && !isLoading && styles.registerButtonPressed,
                ]}
                onPress={handleRegister}
                disabled={!isFormValid || isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContent}>
                    <ActivityIndicator size="small" color={COLORS.white} />
                    <Text style={styles.registerButtonText}>Creating account...</Text>
                  </View>
                ) : (
                  <Text style={styles.registerButtonText}>Sign Up</Text>
                )}
              </Pressable>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.signInContainer}>
                <Text style={styles.signInText}>Already have an account? </Text>
                <Pressable onPress={handleSignIn}>
                  <Text style={styles.signInLink}>Sign In</Text>
                </Pressable>
              </View>

              <Text style={styles.legalText}>
                By creating an account, you agree to our{' '}
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
  registerButton: {
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
    marginTop: SPACING.md,
  },
  registerButtonDisabled: {
    backgroundColor: COLORS.gray400,
    shadowOpacity: 0,
    elevation: 0,
  },
  registerButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  registerButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },

  // Footer
  footer: {
    marginTop: SPACING['2xl'],
    alignItems: 'center',
    gap: SPACING.lg,
  },
  signInContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signInText: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  signInLink: {
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
