import React, { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, KeyboardAvoidingViewProps, Platform } from 'react-native';

export const KeyboardAvoidingWrapper = ({
  children,
  behavior = Platform.OS === 'ios' ? 'padding' : 'height',
  style,
  ...rest
}: PropsWithChildren<KeyboardAvoidingViewProps>) => (
  <KeyboardAvoidingView style={[{ flex: 1 }, style]} behavior={behavior} {...rest}>
    {children}
  </KeyboardAvoidingView>
);
