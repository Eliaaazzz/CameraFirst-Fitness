import React, { PropsWithChildren } from 'react';
import { SafeAreaView, SafeAreaViewProps } from 'react-native-safe-area-context';

import { getTheme } from '@/utils';

export const SafeAreaWrapper = ({ children, style, ...rest }: PropsWithChildren<SafeAreaViewProps>) => {
  // Always use light mode
  const theme = getTheme('light');

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
