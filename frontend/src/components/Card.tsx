import React, { PropsWithChildren, useState } from 'react';
import { Platform, PressableProps, StyleSheet, ViewProps } from 'react-native';
import { Card as PaperCard } from 'react-native-paper';

import { colors, radii, saasShadows } from '@/utils';

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
  const light = colors.light;

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
          transition: 'border-color 0.18s ease-out, transform 0.18s ease-out',
          ...(isHovered && {
            borderColor: light.borderStrong,
            transform: 'translateY(-1px)',
          }),
        }
      : {};

  return (
    <PaperCard
      style={[styles.base, elevationStyles[elevation], hoverStyles, style]}
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
    backgroundColor: colors.light.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.light.borderSubtle,
  },
  content: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});

