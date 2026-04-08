import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  Bell,
  CalendarBlank,
  CheckCircle,
  ForkKnife,
  MegaphoneSimple,
} from 'phosphor-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Button, SafeAreaWrapper, Text } from '@/components';
import { BRAND_COLORS, spacing, useContentBottomPadding } from '@/utils';

const NOTIFICATION_SETTINGS_KEY = '@notification_preferences_v1';

type NotificationSettings = {
  mealReminders: boolean;
  weeklyDigest: boolean;
  productUpdates: boolean;
};

const DEFAULT_SETTINGS: NotificationSettings = {
  mealReminders: true,
  weeklyDigest: true,
  productUpdates: false,
};

function SettingsRow({
  icon,
  title,
  description,
  enabled,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [styles.rowCard, pressed && styles.rowPressed]}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      accessibilityLabel={title}
      accessibilityHint={description}
    >
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowCopy}>
        <Text variant="body" weight="semibold" style={styles.rowTitle}>
          {title}
        </Text>
        <Text variant="caption" style={styles.rowDescription}>
          {description}
        </Text>
      </View>
      <View style={[styles.toggleShell, enabled ? styles.toggleShellOn : styles.toggleShellOff]}>
        <View style={[styles.toggleKnob, enabled ? styles.toggleKnobOn : styles.toggleKnobOff]} />
      </View>
    </Pressable>
  );
}

export const NotificationsScreen = () => {
  const navigation = useNavigation<any>();
  const contentBottomPadding = useContentBottomPadding(spacing.xl);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const hasLoaded = useRef(false);

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
        if (!active || !stored) {
          hasLoaded.current = true;
          return;
        }

        const parsed = JSON.parse(stored) as Partial<NotificationSettings>;
        setSettings({
          mealReminders: parsed.mealReminders ?? DEFAULT_SETTINGS.mealReminders,
          weeklyDigest: parsed.weeklyDigest ?? DEFAULT_SETTINGS.weeklyDigest,
          productUpdates: parsed.productUpdates ?? DEFAULT_SETTINGS.productUpdates,
        });
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      } finally {
        if (active) {
          hasLoaded.current = true;
        }
      }
    };

    void loadSettings();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;

    AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings)).catch((error) => {
      console.error('Failed to save notification settings:', error);
    });
  }, [settings]);

  const toggleSetting = (key: keyof NotificationSettings) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <SafeAreaWrapper>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: contentBottomPadding }]}
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
          <View style={styles.heroBadge}>
            <Bell size={16} weight="fill" color="#8C4A1D" />
            <Text variant="label" weight="bold" style={styles.heroBadgeText}>
              NOTIFICATIONS
            </Text>
          </View>
          <Text variant="hero" weight="bold" style={styles.heroTitle}>
            Control reminders and updates
          </Text>
          <Text variant="body" style={styles.heroBody}>
            These preferences are saved for this device so your reminders and weekly summaries stay consistent.
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="heading3" weight="bold" style={styles.sectionTitle}>
            Preferences
          </Text>
          <SettingsRow
            icon={<ForkKnife size={22} color="#F97316" weight="regular" />}
            title="Meal reminders"
            description="Keep nudges on for meal logging and daily consistency."
            enabled={settings.mealReminders}
            onToggle={() => toggleSetting('mealReminders')}
          />
          <SettingsRow
            icon={<CalendarBlank size={22} color="#2F7A6A" weight="regular" />}
            title="Weekly digest"
            description="Get a weekly recap prompt for trends and adherence."
            enabled={settings.weeklyDigest}
            onToggle={() => toggleSetting('weeklyDigest')}
          />
          <SettingsRow
            icon={<MegaphoneSimple size={22} color="#3B82F6" weight="regular" />}
            title="Product updates"
            description="See occasional updates when new app features are available."
            enabled={settings.productUpdates}
            onToggle={() => toggleSetting('productUpdates')}
          />
        </View>

        <View style={styles.tipCard}>
          <CheckCircle size={20} color="#2F7A6A" weight="fill" />
          <View style={styles.tipCopy}>
            <Text variant="body" weight="semibold" style={styles.tipTitle}>
              Preferences saved automatically
            </Text>
            <Text variant="caption" style={styles.tipText}>
              You can come back here anytime from Profile to change what this device shows.
            </Text>
          </View>
        </View>

        <Button
          title="Open Help Center"
          variant="secondary"
          onPress={() => navigation.navigate('Help')}
        />
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F2',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFFEFB',
    borderWidth: 1,
    borderColor: '#E9DED0',
  },
  backButtonPressed: {
    opacity: 0.8,
  },
  backText: {
    color: '#111111',
  },
  heroCard: {
    backgroundColor: '#FFFEFB',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E9DED0',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFF1E5',
    borderWidth: 1,
    borderColor: '#F3D8BF',
  },
  heroBadgeText: {
    color: '#8C4A1D',
    letterSpacing: 0.4,
  },
  heroTitle: {
    color: '#111111',
  },
  heroBody: {
    color: '#4B5563',
    lineHeight: 24,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: '#111111',
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 22,
    backgroundColor: '#FFFEFB',
    borderWidth: 1,
    borderColor: '#E9DED0',
  },
  rowPressed: {
    opacity: 0.82,
  },
  rowIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#FBF8F1',
    borderWidth: 1,
    borderColor: '#E9E0D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: '#111111',
  },
  rowDescription: {
    color: '#6B665F',
    lineHeight: 18,
  },
  toggleShell: {
    width: 52,
    height: 32,
    borderRadius: 16,
    padding: 3,
    justifyContent: 'center',
  },
  toggleShellOn: {
    backgroundColor: '#111111',
  },
  toggleShellOff: {
    backgroundColor: '#E7DED2',
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
  },
  toggleKnobOff: {
    alignSelf: 'flex-start',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 22,
    backgroundColor: '#ECF9F3',
    borderWidth: 1,
    borderColor: '#CBEBDD',
  },
  tipCopy: {
    flex: 1,
    gap: 2,
  },
  tipTitle: {
    color: '#111111',
  },
  tipText: {
    color: '#2F7A6A',
    lineHeight: 18,
  },
});

export default NotificationsScreen;
