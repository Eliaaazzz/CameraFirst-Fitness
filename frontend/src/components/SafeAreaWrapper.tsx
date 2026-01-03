import React, { PropsWithChildren } from 'react';
import { SafeAreaView, SafeAreaViewProps } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { getTheme } from '@/utils';

export const SafeAreaWrapper = ({ children, style, ...rest }: PropsWithChildren<SafeAreaViewProps>) => {
  // Always use light mode
  const theme = getTheme('light');
  const gradient = (theme.colors as any).backgroundGradient;

  if (gradient) {
    return (
      <LinearGradient
        colors={gradient}
        style={{ flex: 1 }}
      >
        <SafeAreaView
          edges={['top', 'right', 'left']}
          style={[{ flex: 1, backgroundColor: 'transparent' }, style]}
          {...rest}
        >
          {children}
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'right', 'left']}
      style={[{ flex: 1, backgroundColor: theme.colors.background }, style]}
      {...rest}
    >
      {children}
    </SafeAreaView>
  );
};
