import React, { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import { spacing } from '@/utils';
import { useContainerMaxWidth, useResponsive, useResponsivePadding } from '@/utils/responsive';

interface ContainerProps extends ViewProps {
  /**
   * If true, centers the container and applies max-width on desktop
   * @default true
   */
  centered?: boolean;
  /**
   * If true, uses responsive padding that scales with device size
   * @default true
   */
  responsivePadding?: boolean;
}

export const Container = ({
  children,
  style,
  centered = true,
  responsivePadding = true,
  ...rest
}: PropsWithChildren<ContainerProps>) => {
  const { isDesktop } = useResponsive();
  const maxWidth = useContainerMaxWidth();
  const padding = useResponsivePadding();

  return (
    <View
      style={[
        styles.container,
        responsivePadding && {
          paddingHorizontal: padding,
          paddingVertical: padding,
        },
        centered && isDesktop && styles.centeredContainer,
        ...(centered && maxWidth ? [{ maxWidth }] : []),
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  centeredContainer: {
    alignSelf: 'center',
    width: '100%',
  },
});
