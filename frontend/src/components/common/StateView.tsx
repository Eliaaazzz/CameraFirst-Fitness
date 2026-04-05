import React from 'react';
import { WarningCircle, Tray, ArrowCounterClockwise } from 'phosphor-react-native';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { BRAND_COLORS, spacing } from '@/utils';

import { Card } from '@/components/Card';
import { Text } from '@/components/Text';

interface StateViewProps {
  type: 'loading' | 'error' | 'empty';
  title?: string;
  message?: string;
  icon?: string;
  iconColor?: string;
  onRetry?: () => void;
  retryLabel?: string;
  children?: React.ReactNode;
}

export const StateView: React.FC<StateViewProps> = ({
  type,
  title,
  message,
  icon,
  iconColor,
  onRetry,
  retryLabel = 'Retry',
  children,
}) => {
  const getDefaultConfig = () => {
    switch (type) {
      case 'loading':
        return {
          title: title || 'Loading',
          message: message || 'Please wait a moment.',
          icon: 'loading',
          iconColor: BRAND_COLORS.primary,
        };
      case 'error':
        return {
          title: title || 'Something went wrong',
          message: message || 'Please check your connection and try again.',
          icon: icon || 'warning-circle',
          iconColor: iconColor || BRAND_COLORS.error,
        };
      case 'empty':
        return {
          title: title || 'Nothing here yet',
          message: message || 'Start with the next action above.',
          icon: icon || 'tray',
          iconColor: iconColor || BRAND_COLORS.textMuted,
        };
    }
  };

  const config = getDefaultConfig();

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <View style={styles.iconContainer}>
          {type === 'loading' ? (
            <ActivityIndicator size="large" color={config.iconColor} />
          ) : (
            config.icon === 'warning-circle' ? (
              <WarningCircle size={52} color={config.iconColor} />
            ) : (
              <Tray size={52} color={config.iconColor} />
            )
          )}
        </View>

        <Text variant="heading2" weight="bold" style={styles.title}>
          {title || config.title}
        </Text>

        <Text variant="body" style={styles.message}>
          {message || config.message}
        </Text>

        {children}

        {onRetry && type !== 'loading' ? (
          <Pressable
            style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
            onPress={onRetry}
          >
            <ArrowCounterClockwise size={18} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>{retryLabel}</Text>
          </Pressable>
        ) : null}
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    padding: spacing.xl,
    alignItems: 'center',
    maxWidth: 360,
    width: '100%',
  },
  iconContainer: {
    marginBottom: spacing.lg,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BRAND_COLORS.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    textAlign: 'center',
    color: BRAND_COLORS.textSecondary,
    marginBottom: spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  retryButtonPressed: {
    opacity: 0.88,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default StateView;

