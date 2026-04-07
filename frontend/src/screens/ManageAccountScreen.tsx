import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  EnvelopeSimple,
  ShieldCheck,
  SignOut,
  Trash,
  UserCircle,
} from 'phosphor-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Button, SafeAreaWrapper, Text } from '@/components';
import { StateView } from '@/components/common/StateView';
import useCurrentUser from '@/hooks/useCurrentUser';
import userApi from '@/services/userApi';
import { useAuthStore } from '@/stores';
import { HYDRATION_STORAGE_KEY } from '@/stores/useHydrationStore';
import { BRAND_COLORS, radii, spacing } from '@/utils';
import { GENERATED_GOALS_KEY } from './ProfileScreen';

function DetailCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailCard}>
      <View style={styles.detailIcon}>{icon}</View>
      <View style={styles.detailCopy}>
        <Text variant="caption" weight="semibold" style={styles.detailLabel}>
          {label}
        </Text>
        <Text variant="body" weight="semibold" style={styles.detailValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export const ManageAccountScreen = () => {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const { signOut } = useAuthStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const accountProvider = useMemo(() => {
    const provider = currentUser.data?.authProvider;
    if (!provider) return 'Email';
    return provider
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }, [currentUser.data?.authProvider]);

  const finishSignedOutState = useCallback(async () => {
    await AsyncStorage.multiRemove([GENERATED_GOALS_KEY, HYDRATION_STORAGE_KEY]);
    queryClient.clear();
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Landing' } as any] });
  }, [navigation, queryClient, signOut]);

  const handleSignOut = useCallback(async () => {
    if (isSigningOut || isDeleting) return;
    setIsSigningOut(true);
    try {
      await finishSignedOutState();
    } catch (error) {
      console.error('Failed to sign out from manage account:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  }, [finishSignedOutState, isDeleting, isSigningOut]);

  const performDeleteAccount = useCallback(async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      await userApi.deleteAccount();
      await finishSignedOutState();
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (error) {
      console.error('Failed to delete account from manage account:', error);
      Alert.alert('Error', 'Failed to delete account. Please try again.');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
    } finally {
      setIsDeleting(false);
    }
  }, [finishSignedOutState, isDeleting]);

  const confirmDeleteAccount = useCallback(() => {
    const message = 'Delete your account permanently? This removes your profile, goals, and saved history.';

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm(message) : true;
      if (confirmed) {
        performDeleteAccount();
      }
      return;
    }

    Alert.alert(
      'Delete Account',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: performDeleteAccount,
        },
      ]
    );
  }, [performDeleteAccount]);

  if (currentUser.isLoading) {
    return (
      <SafeAreaWrapper>
        <StateView type="loading" title="Loading account..." />
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={18} color="#111111" />
          <Text variant="body" weight="semibold" style={styles.backText}>
            Back
          </Text>
        </Pressable>

        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroBadge}>
              <ShieldCheck size={16} weight="fill" color={BRAND_COLORS.primaryDark} />
              <Text variant="label" weight="bold" style={styles.heroBadgeText}>
                Account center
              </Text>
            </View>
            <Pressable
              onPress={() =>
                navigation.dispatch(
                  CommonActions.navigate({
                    name: 'Main',
                    params: { screen: 'Profile', params: { screen: 'ProfileMain' } },
                  })
                )
              }
              style={({ pressed }) => [styles.heroLink, pressed && styles.heroLinkPressed]}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
            >
              <Text variant="body" weight="semibold" style={styles.heroLinkText}>
                Open profile
              </Text>
            </Pressable>
          </View>

          <Text variant="hero" weight="bold" style={styles.heroTitle}>
            Manage account
          </Text>
          <Text variant="body" style={styles.heroBody}>
            Review your login details, sign out on this device, or permanently remove your account.
          </Text>

          <View style={styles.detailsGrid}>
            <DetailCard
              icon={<UserCircle size={18} color="#111111" weight="regular" />}
              label="Username"
              value={currentUser.data?.username || 'User'}
            />
            <DetailCard
              icon={<EnvelopeSimple size={18} color="#111111" weight="regular" />}
              label="Email"
              value={currentUser.data?.email || 'No email'}
            />
            <DetailCard
              icon={<ShieldCheck size={18} color="#111111" weight="regular" />}
              label="Sign-in method"
              value={accountProvider}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text variant="heading3" weight="bold" style={styles.sectionTitle}>
            Session
          </Text>
          <Text variant="body" style={styles.sectionBody}>
            Sign out on this device without affecting your account data.
          </Text>
          <Button
            title="Sign out"
            variant="secondary"
            fullWidth
            loading={isSigningOut}
            onPress={handleSignOut}
            icon={<SignOut size={18} color="#111111" />}
          />
        </View>

        <View style={[styles.sectionCard, styles.dangerCard]}>
          <Text variant="heading3" weight="bold" style={styles.sectionTitle}>
            Danger zone
          </Text>
          <Text variant="body" style={styles.sectionBody}>
            Account deletion is permanent. Your profile, generated goals, saved items, and history are removed from the backend.
          </Text>
          <Button
            title="Delete account"
            variant="outline"
            fullWidth
            loading={isDeleting}
            onPress={confirmDeleteAccount}
            textColor={BRAND_COLORS.semantic.error}
            icon={<Trash size={18} color={BRAND_COLORS.semantic.error} />}
            style={styles.deleteButton}
          />
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F4F1EA',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
    }),
  },
  backButtonPressed: {
    opacity: 0.8,
  },
  backText: {
    color: '#111111',
  },
  heroCard: {
    borderRadius: 28,
    padding: spacing.xl,
    backgroundColor: '#FFF5E8',
    borderWidth: 1,
    borderColor: 'rgba(201,106,52,0.14)',
    gap: spacing.lg,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.84)',
  },
  heroBadgeText: {
    color: BRAND_COLORS.primaryDark,
  },
  heroLink: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.14)',
    paddingBottom: 2,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
    }),
  },
  heroLinkPressed: {
    opacity: 0.72,
  },
  heroLinkText: {
    color: '#111111',
  },
  heroTitle: {
    color: '#111111',
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: -1.8,
  },
  heroBody: {
    color: '#3E3C38',
    fontSize: 17,
    lineHeight: 28,
    maxWidth: 680,
  },
  detailsGrid: {
    gap: spacing.md,
    ...(Platform.OS === 'web'
      ? {
          flexDirection: 'row',
          alignItems: 'stretch',
        }
      : {}),
  },
  detailCard: {
    flex: 1,
    minHeight: 108,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.08)',
    gap: spacing.md,
  },
  detailIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#F4F1EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCopy: {
    gap: 4,
  },
  detailLabel: {
    color: '#6D6860',
  },
  detailValue: {
    color: '#111111',
  },
  sectionCard: {
    borderRadius: 24,
    padding: spacing.xl,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.08)',
    gap: spacing.md,
  },
  dangerCard: {
    backgroundColor: '#FFF8F6',
    borderColor: 'rgba(208,92,65,0.16)',
  },
  sectionTitle: {
    color: '#111111',
  },
  sectionBody: {
    color: '#3E3C38',
    lineHeight: 24,
    maxWidth: 720,
  },
  deleteButton: {
    borderColor: 'rgba(208,92,65,0.22)',
    backgroundColor: 'rgba(255,255,255,0.86)',
  },
});

export default ManageAccountScreen;
