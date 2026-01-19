import React, { PropsWithChildren, useState } from 'react';
import { Platform, PressableProps, StyleSheet, ViewProps } from 'react-native';
import { Card as PaperCard } from 'react-native-paper';

import { radii, saasShadows } from '@/utils';

export interface CardProps extends PropsWithChildren<ViewProps> {
  onPress?: PressableProps['onPress'];
  elevation?: 'none' | 'light' | 'medium' | 'heavy';
  enableHover?: boolean;
}

const elevationStyles = {
  none: {},
  light: saasShadows.subtle,
  medium: saasShadows.card,
  heavy: saasShadows.cardElevated,
};

export const Card = ({
  children,
  style,
  onPress,
  elevation = 'light',
  enableHover = false,
  ...rest
}: CardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  // Web hover handlers - only for interactive cards
  const webHoverProps =
    Platform.OS === 'web' && enableHover && onPress
      ? {
          onMouseEnter: () => setIsHovered(true),
          onMouseLeave: () => setIsHovered(false),
        }
      : {};

  const hoverStyles =
    Platform.OS === 'web' && enableHover && onPress
      ? {
          cursor: 'pointer' as const,
          transition: 'all 0.2s ease-out',
          transform: isHovered ? [{ translateY: -2 }] : [],
          ...(isHovered && {
            boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.06), 0 8px 24px 0 rgba(124, 58, 237, 0.12)',
            borderColor: 'rgba(124, 58, 237, 0.15)',
          }),
        }
      : {};

  // Add cursor pointer for all interactive cards on web
  const webInteractiveStyles = Platform.OS === 'web' && onPress
    ? { cursor: 'pointer' as const }
    : {};

  return (
    <PaperCard
      style={[styles.base, elevationStyles[elevation], webInteractiveStyles, hoverStyles, style]}
      onPress={onPress}
      {...webHoverProps}
      {...(rest as any)}
    >
      <PaperCard.Content style={styles.content}>{children}</PaperCard.Content>
    </PaperCard>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.xl,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.6)', // Ultra-thin gray border for premium feel
  },
  content: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});
