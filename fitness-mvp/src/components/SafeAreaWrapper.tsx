import React, { PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaView, SafeAreaViewProps } from 'react-native-safe-area-context';

import { COLORS } from '@/utils';

export const SafeAreaWrapper = ({ children, style, ...rest }: PropsWithChildren<SafeAreaViewProps>) => {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? COLORS.background.dark : COLORS.background.light;

  return (
    <SafeAreaView
      edges={['top', 'right', 'left']}
      style={[{ flex: 1, backgroundColor }, style]}
      {...rest}
    >
      {children}
    </SafeAreaView>
  );
};
