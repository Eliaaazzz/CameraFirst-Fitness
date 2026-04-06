/**
 * WelcomeBar - secondary black strip for the authenticated desktop homepage.
 *
 * Pattern: Uber logged-in welcome rail with greeting left, status summary center,
 * and quick account actions right.
 */

import {
  CalendarBlank,
  ChartLine,
  Fire,
  UserCircle,
} from 'phosphor-react-native';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { spacing } from '@/utils';

interface WelcomeBarProps {
  username: string;
  streak: number;
  summaryText?: string;
  onActivityPress?: () => void;
  onInsightsPress?: () => void;
  onAccountPress?: () => void;
}

export function WelcomeBar({
  username,
  streak,
  summaryText = 'No scheduled activity yet',
  onActivityPress,
  onInsightsPress,
  onAccountPress,
}: WelcomeBarProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        <View style={styles.left}>
          <Text variant="heading3" weight="bold" style={styles.greeting}>
            Welcome back, {username}
          </Text>
        </View>

        <View style={styles.summary}>
          <CalendarBlank size={18} weight="bold" color="#FFFFFF" />
          <Text variant="body" weight="semibold" style={styles.summaryText}>
            {summaryText}
          </Text>
          {streak > 0 && (
            <View style={styles.streakChip}>
              <Fire size={14} weight="fill" color="#F59E0B" />
              <Text variant="caption" weight="semibold" style={styles.streakText}>
                {streak} day streak
              </Text>
            </View>
          )}
        </View>

        <View style={styles.right}>
          {onActivityPress && (
            <Pressable
              onPress={onActivityPress}
              style={({ pressed }) => [styles.actionLink, pressed && styles.actionLinkPressed]}
            >
              <CalendarBlank size={16} weight="regular" color="#FFFFFF" />
              <Text variant="body" weight="semibold" style={styles.actionText}>
                Activity
              </Text>
            </Pressable>
          )}
          {onInsightsPress && (
            <Pressable
              onPress={onInsightsPress}
              style={({ pressed }) => [styles.actionLink, pressed && styles.actionLinkPressed]}
            >
              <ChartLine size={16} weight="regular" color="#FFFFFF" />
              <Text variant="body" weight="semibold" style={styles.actionText}>
                Reports
              </Text>
            </Pressable>
          )}
          {onAccountPress && (
            <Pressable
              onPress={onAccountPress}
              style={({ pressed }) => [styles.actionLink, pressed && styles.actionLinkPressed]}
            >
              <UserCircle size={16} weight="regular" color="#FFFFFF" />
              <Text variant="body" weight="semibold" style={styles.actionText}>
                Account
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    maxWidth: 1360,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 260,
  },
  greeting: {
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  summary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  summaryText: {
    color: 'rgba(255,255,255,0.74)',
  },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: spacing.sm,
  },
  streakText: {
    color: '#FFFFFF',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  actionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
    }),
  },
  actionLinkPressed: {
    opacity: 0.72,
  },
  actionText: {
    color: '#FFFFFF',
  },
});

export default WelcomeBar;
