import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { BRAND_COLORS, spacing } from '@/utils';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

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

/**
 * Unified state component for loading, error, and empty states.
 * Provides consistent UX across all screens.
 */
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
          title: title || 'Loading...',
          message: message || 'Please wait a moment',
          icon: 'loading',
          iconColor: BRAND_COLORS.primary,
        };
      case 'error':
        return {
          title: title || 'Oops! Something went wrong',
          message: message || 'Please check your connection and try again',
          icon: icon || 'alert-circle-outline',
          iconColor: iconColor || '#EF4444',
        };
      case 'empty':
        return {
          title: title || 'Nothing here yet',
          message: message || 'Start by adding some items',
          icon: icon || 'inbox-outline',
          iconColor: iconColor || '#374151',
        };
      default:
        return {
          title: '',
          message: '',
          icon: 'help-circle-outline',
          iconColor: '#374151',
        };
    }
  };

  const config = getDefaultConfig();
  const displayTitle = title || config.title;
  const displayMessage = message || config.message;
  const displayIcon = icon || config.icon;
  const displayIconColor = iconColor || config.iconColor;

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <View style={styles.iconContainer}>
          {type === 'loading' ? (
            <ActivityIndicator size="large" color={displayIconColor} />
          ) : (
            <MaterialCommunityIcons
              name={displayIcon as any}
              size={56}
              color={displayIconColor}
            />
          )}
        </View>

        <Text variant="heading2" weight="bold" style={styles.title}>
          {displayTitle}
        </Text>

        <Text variant="body" style={styles.message}>
          {displayMessage}
        </Text>

        {children}

        {onRetry && type !== 'loading' && (
          <Pressable
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
            onPress={onRetry}
          >
            <MaterialCommunityIcons name="refresh" size={18} color="#1A1F2E" />
            <Text style={styles.retryButtonText}>{retryLabel}</Text>
          </Pressable>
        )}
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
    maxWidth: 340,
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
    opacity: 0.7,
    marginBottom: spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ECDC4',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  retryButtonPressed: {
    opacity: 0.8,
  },
  retryButtonText: {
    color: '#1A1F2E',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default StateView;
