import { Text } from '@/components';
import { COLORS, SPACING } from '@/utils/theme';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'hero' | 'compact';
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  children,
  style,
  variant = 'default',
}) => {
  const isHero = variant === 'hero';
  const isCompact = variant === 'compact';

  return (
    <LinearGradient
      colors={[
        isHero ? COLORS.primary.main + '40' : COLORS.primary.main + '20',
        COLORS.dark.background,
      ]}
      style={[
        styles.container,
        isHero && styles.heroContainer,
        isCompact && styles.compactContainer,
        style,
      ]}
    >
      <View style={styles.textContainer}>
        <Text
          variant={isCompact ? 'heading2' : 'heading1'}
          weight="bold"
          style={styles.title}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            variant={isCompact ? 'caption' : 'body'}
            style={styles.subtitle}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {children && <View style={styles.childrenContainer}>{children}</View>}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  heroContainer: {
    paddingTop: 80,
    paddingBottom: SPACING.xl,
  },
  compactContainer: {
    paddingTop: 50,
    paddingBottom: SPACING.md,
  },
  textContainer: {
    gap: SPACING.xs,
  },
  title: {
    color: COLORS.text.primary,
  },
  subtitle: {
    color: COLORS.text.secondary,
    opacity: 0.8,
  },
  childrenContainer: {
    marginTop: SPACING.md,
  },
});
