import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SnackbarProvider } from '@/components/SnackbarProvider';
import { AppNavigator } from '@/navigation/AppNavigator';
import { queryClient } from '@/services';
import { BRAND_COLORS } from '@/utils';

const App = () => {
  const colorScheme = useColorScheme();
  const barStyle = colorScheme === 'dark' ? 'light' : 'dark';

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: BRAND_COLORS.background }}>
      <SafeAreaProvider>
        <PaperProvider>
          <QueryClientProvider client={queryClient}>
            <SnackbarProvider>
              <StatusBar style={barStyle} />
              <AppNavigator />
            </SnackbarProvider>
          </QueryClientProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
