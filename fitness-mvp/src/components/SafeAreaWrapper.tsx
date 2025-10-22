import React, { PropsWithChildren } from 'react';
import { SafeAreaView, SafeAreaViewProps } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';

import { getTheme } from '@/utils';

export const SafeAreaWrapper = ({ children, style, ...rest }: PropsWithChildren<SafeAreaViewProps>) => {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme === 'dark' ? 'dark' : 'light');

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
