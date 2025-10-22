import React from 'react';
import { Platform, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useColorScheme } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { CaptureScreen } from '@/screens/CaptureScreen';
import { WorkoutsScreen } from '@/screens/WorkoutsScreen';
import { RecipesScreen } from '@/screens/RecipesScreen';
import { ResultsScreen } from '@/screens/ResultsScreen';
import { DesignSystemScreen } from '@/screens/DesignSystemScreen';
import { BRAND_COLORS, TAB_ICON_SIZE } from '@/utils';

const Tab = createBottomTabNavigator();

const tabBarBackground = () => (
  <View
    style={{
      backgroundColor: BRAND_COLORS.surface,
      flex: 1,
      borderTopWidth: 0,
    }}
  />
);

const LightNavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: BRAND_COLORS.primary,
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#0F172A',
    border: '#E2E8F0',
    notification: BRAND_COLORS.secondary,
  },
};

const DarkNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: BRAND_COLORS.primary,
    background: BRAND_COLORS.background,
    card: BRAND_COLORS.surface,
    text: BRAND_COLORS.textPrimary,
    border: 'rgba(255,255,255,0.1)',
    notification: BRAND_COLORS.secondary,
  },
};

export const AppNavigator = () => {
  const colorScheme = useColorScheme();

  return (
    <NavigationContainer theme={colorScheme === 'dark' ? DarkNavigationTheme : LightNavigationTheme}>
      <Tab.Navigator
        initialRouteName="Capture"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: BRAND_COLORS.primary,
          tabBarInactiveTintColor: BRAND_COLORS.tabInactive,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            height: Platform.select({ ios: 60, android: 56 }),
            paddingBottom: Platform.select({ ios: 12, android: 8 }),
            paddingTop: 8,
            backgroundColor: BRAND_COLORS.surface,
            borderTopWidth: 0,
            elevation: 10,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: -2 },
          },
          tabBarBackground,
          tabBarIcon: ({ color, focused }) => {
            switch (route.name) {
              case 'Capture':
                return (
                  <Feather
                    name="camera"
                    size={focused ? TAB_ICON_SIZE.focused : TAB_ICON_SIZE.default}
                    color={color}
                  />
                );
              case 'Workouts':
                return (
                  <MaterialCommunityIcons
                    name={focused ? 'dumbbell' : 'dumbbell'}
                    size={focused ? TAB_ICON_SIZE.focused : TAB_ICON_SIZE.default}
                    color={color}
                  />
                );
              case 'Recipes':
                return (
                  <Feather
                    name="coffee"
                    size={focused ? TAB_ICON_SIZE.focused : TAB_ICON_SIZE.default}
                    color={color}
                  />
                );
              case 'DesignSystem':
                return (
                  <Feather
                    name="tool"
                    size={focused ? TAB_ICON_SIZE.focused : TAB_ICON_SIZE.default}
                    color={color}
                  />
                );
              case 'Results':
                return (
                  <Feather
                    name="list"
                    size={focused ? TAB_ICON_SIZE.focused : TAB_ICON_SIZE.default}
                    color={color}
                  />
                );
              default:
                return null;
            }
          },
        })}
      >
        <Tab.Screen name="Capture" component={CaptureScreen} options={{ title: 'Capture' }} />
        <Tab.Screen name="Workouts" component={WorkoutsScreen} options={{ title: 'Workouts' }} />
        <Tab.Screen name="Recipes" component={RecipesScreen} options={{ title: 'Recipes' }} />
        {__DEV__ && (
          <Tab.Screen name="DesignSystem" component={DesignSystemScreen} options={{ title: 'Design' }} />
        )}
        {__DEV__ && (
          <Tab.Screen name="Results" component={ResultsScreen} options={{ title: 'Results' }} />
        )}
      </Tab.Navigator>
    </NavigationContainer>
  );
};
