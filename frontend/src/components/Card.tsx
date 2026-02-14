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
          transition: 'border-color 0.2s ease-out',
          ...(isHovered && {
            borderColor: 'rgba(209, 213, 219, 1)',
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
    borderRadius: radii['2xl'],
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.48)',
  },
  content: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});
