import { COLORS, SPACING, TYPOGRAPHY } from '@/utils/theme';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  style?: ViewStyle;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      
      {action && (
        <Text style={styles.action} onPress={action.onPress}>
          {action.label}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.h3,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.text.primary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.sizes.bodyS,
    fontWeight: TYPOGRAPHY.weights.regular,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  action: {
    fontSize: TYPOGRAPHY.sizes.bodyS,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.primary.main,
  },
});
