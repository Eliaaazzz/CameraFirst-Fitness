import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MD3LightTheme as PaperLightTheme, Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TourGuideProvider } from '@/components/tour/TourProvider';

import { SnackbarProvider } from '@/components';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { AppNavigator } from '@/navigation/AppNavigator';
import { queryClient } from '@/services';
import { BRAND_COLORS, getTheme } from '@/utils';

// Top-level error boundary to catch and display errors on web
class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#121212' }}>
          <Text style={{ color: '#EF4444', fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
            App Error
          </Text>
          <Text style={{ color: '#F9FAFB', fontSize: 14, textAlign: 'center' }}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
          <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 10, textAlign: 'center' }}>
            {this.state.error?.stack?.slice(0, 500)}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  // Always use light mode
  const barStyle = 'dark';
  const { isChecking, needsUpdate, currentVersion } = useVersionCheck();

  // Ensure theme has all required properties for web platform
  const baseTheme = PaperLightTheme;
  const customTheme = getTheme('light');

  // Calculate direction for cross-platform compatibility
  const themeDirection = 'ltr';

  const paperTheme = {
    ...baseTheme,
    direction: themeDirection,
    colors: {
      ...baseTheme.colors,
      primary: customTheme.colors.primary,
      primaryContainer: customTheme.colors.primaryContainer,
      secondary: customTheme.colors.secondary,
      secondaryContainer: customTheme.colors.secondaryContainer,
      background: customTheme.colors.background,
      surface: customTheme.colors.surface,
      surfaceVariant: customTheme.colors.surfaceVariant,
      error: customTheme.colors.error,
      onSurface: customTheme.colors.textPrimary,
      onBackground: customTheme.colors.textPrimary,
      outline: customTheme.colors.border,
    },
  } as any;

  // Show loading screen while checking version
  if (isChecking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BRAND_COLORS.background }}>
        <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
        <Text style={{ color: BRAND_COLORS.textSecondary, marginTop: 16, fontSize: 14 }}>
          Checking app version...
        </Text>
        <Text style={{ color: BRAND_COLORS.textSecondary, marginTop: 8, fontSize: 12 }}>
          v{currentVersion}
        </Text>
      </View>
    );
  }

  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: BRAND_COLORS.background }}>
        <SafeAreaProvider>
          <PaperProvider theme={paperTheme}>
            <QueryClientProvider client={queryClient}>
              <SnackbarProvider>
                <TourGuideProvider
                  backdropColor="rgba(0, 0, 0, 0.75)"
                  borderRadius={16}
                  maskOffset={8}
                  animationDuration={300}
                  labels={{
                    previous: 'Back',
                    next: 'Next',
                    skip: 'Skip',
                    finish: 'Done',
                  }}
                  tooltipStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  <StatusBar style={barStyle} />
                  <AppNavigator />
                </TourGuideProvider>
              </SnackbarProvider>
            </QueryClientProvider>
          </PaperProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
};

export default App;
