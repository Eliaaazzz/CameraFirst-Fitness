import { COLORS, SPACING, TYPOGRAPHY } from '@/utils/theme';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      
      <Text style={styles.title}>{title}</Text>
      
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}
      
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="tonal"
          size="md"
          style={styles.button}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary.surfaceTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.h3,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  description: {
    fontSize: TYPOGRAPHY.sizes.bodyM,
    fontWeight: TYPOGRAPHY.weights.regular,
    color: COLORS.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  button: {
    marginTop: SPACING.lg,
  },
});
