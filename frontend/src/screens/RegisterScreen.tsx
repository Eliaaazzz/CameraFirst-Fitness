import { EnvelopeSimple, Eye, EyeSlash, Lock, ShieldCheck } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuraMark, Text } from '@/components';
import { api } from '@/services/apiClient';
import { queryClient } from '@/services/queryClient';
import { useAuthStore } from '@/stores';
import { BRAND_COLORS, radii, spacing } from '@/utils';

interface InputFieldProps {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  showToggle?: boolean;
  onToggleSecure?: () => void;
  isSecureVisible?: boolean;
  keyboardType?: 'default' | 'email-address';
}

function InputField({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  showToggle = false,
  onToggleSecure,
  isSecureVisible = false,
  keyboardType = 'default',
}: InputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
      {icon}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={BRAND_COLORS.textMuted}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        secureTextEntry={secureTextEntry && !isSecureVisible}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType}
      />
      {showToggle ? (
        <Pressable onPress={onToggleSecure} hitSlop={8}>
          {isSecureVisible ? <EyeSlash size={18} color={BRAND_COLORS.textMuted} /> : <Eye size={18} color={BRAND_COLORS.textMuted} />}
        </Pressable>
      ) : null}
    </View>
  );
}

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEmailValid = useMemo(() => email.trim().length > 0 && email.includes('@'), [email]);
  const isPasswordValid = useMemo(() => password.length >= 8, [password]);
  const doPasswordsMatch = useMemo(() => password === confirmPassword, [password, confirmPassword]);
  const isFormValid = isEmailValid && isPasswordValid && doPasswordsMatch;

  const handleRegister = async () => {
    if (!isFormValid) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const authResult = await api.post<{ token: string; email: string }>('/api/v1/auth/register', {
        email: email.trim().toLowerCase(),
        password,
      });

      queryClient.clear();
      await useAuthStore.getState().signIn(authResult.token, {
        userId: '',
        email: authResult.email,
        username: '',
        currentStreak: 0,
        level: 'beginner',
        timeBucket: 0,
      });

      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.logoSection}>
              <AuraMark size={96} />
              <Text variant="heading1" weight="bold" style={styles.title}>
                Create your account
              </Text>
              <Text variant="body" color={BRAND_COLORS.textSecondary} style={styles.subtitle}>
                Start with a calmer way to track food, training, and progress.
              </Text>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Text variant="caption" weight="medium" style={styles.errorText}>
                  {error}
                </Text>
              </View>
            ) : null}

            <View style={styles.formSection}>
              <InputField
                icon={<EnvelopeSimple size={18} color={BRAND_COLORS.textMuted} />}
                placeholder="Email address"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError(null);
                }}
                keyboardType="email-address"
              />

              <InputField
                icon={<Lock size={18} color={BRAND_COLORS.textMuted} />}
                placeholder="Password (min 8 characters)"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError(null);
                }}
                secureTextEntry
                showToggle
                isSecureVisible={showPassword}
                onToggleSecure={() => setShowPassword((value) => !value)}
              />

              <InputField
                icon={<ShieldCheck size={18} color={BRAND_COLORS.textMuted} />}
                placeholder="Confirm password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setError(null);
                }}
                secureTextEntry
                showToggle
                isSecureVisible={showConfirmPassword}
                onToggleSecure={() => setShowConfirmPassword((value) => !value)}
              />

              <Pressable
                onPress={handleRegister}
                disabled={!isFormValid || isLoading}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (!isFormValid || isLoading) && styles.primaryButtonDisabled,
                  pressed && isFormValid && !isLoading && styles.primaryButtonPressed,
                ]}
              >
                <Text variant="body" weight="bold" style={styles.primaryButtonText}>
                  {isLoading ? 'Creating account...' : 'Create account'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.footer}>
              <Text variant="caption" color={BRAND_COLORS.textSecondary}>
                Already have an account?
              </Text>
              <Pressable onPress={() => navigation.goBack()}>
                <Text variant="caption" weight="semibold" style={styles.footerLink}>
                  Sign in
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: BRAND_COLORS.surfaceElevated,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: BRAND_COLORS.borderSubtle,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  logoSection: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 280,
  },
  errorContainer: {
    backgroundColor: 'rgba(208, 92, 65, 0.10)',
    borderRadius: radii.md,
    padding: spacing.md,
  },
  errorText: {
    color: BRAND_COLORS.error,
    textAlign: 'center',
  },
  formSection: {
    gap: spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: BRAND_COLORS.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  inputContainerFocused: {
    borderColor: BRAND_COLORS.primary,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: BRAND_COLORS.textPrimary,
    minHeight: 52,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: radii.lg,
    backgroundColor: BRAND_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: BRAND_COLORS.textDisabled,
  },
  primaryButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerLink: {
    color: BRAND_COLORS.primaryDark,
  },
});

