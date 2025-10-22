import React, { PropsWithChildren } from 'react';
import { Pressable, PressableProps, StyleSheet, View, ViewProps, useColorScheme } from 'react-native';

import { getTheme, radii, shadows, spacing } from '@/utils';

export interface CardProps extends PropsWithChildren<ViewProps> {
  onPress?: PressableProps['onPress'];
  elevation?: 'light' | 'medium' | 'heavy';
}

export const Card = ({ children, style, onPress, elevation = 'light', ...rest }: CardProps) => {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme === 'dark' ? 'dark' : 'light');
  const elevationStyle = shadows[colorScheme === 'dark' ? 'dark' : 'light'][elevation];

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.base,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          elevationStyle,
          { opacity: pressed ? 0.92 : 1 },
          style,
        ]}
        accessibilityRole="button"
        onPress={onPress}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        elevationStyle,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
