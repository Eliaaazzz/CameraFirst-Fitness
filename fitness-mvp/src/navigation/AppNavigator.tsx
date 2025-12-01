import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';

import { CaptureScreen } from '@/screens/CaptureScreen';
import { CommunityScreen } from '@/screens/CommunityScreen';
import { DesignSystemScreen } from '@/screens/DesignSystemScreen';
import { GoalsScreen } from '@/screens/GoalsScreen';
import { MealPlanScreen } from '@/screens/MealPlanScreen';
import { RecipesScreen } from '@/screens/RecipesScreen';
import { WorkoutsScreen } from '@/screens/WorkoutsScreen';
import { COLORS, ELEVATION, TAB_ICON_SIZE } from '@/utils/theme';

const Tab = createBottomTabNavigator();

// Enhanced tab bar background with gradient
const tabBarBackground = () => (
  <LinearGradient
    colors={[COLORS.dark.surfaceElevated, COLORS.surface.primary] as const}
    style={StyleSheet.absoluteFill}
    start={{ x: 0, y: 0 }}
    end={{ x: 0, y: 1 }}
  />
);

// Helper function to render icons
const renderIcon = (routeName: string, iconSize: number, color: string) => {
  switch (routeName) {
    case 'Capture':
      return <Feather name="camera" size={iconSize} color={color} />;
    case 'Community':
      return <Feather name="users" size={iconSize} color={color} />;
    case 'Workouts':
      return <MaterialCommunityIcons name="dumbbell" size={iconSize} color={color} />;
    case 'MealPlan':
      return <Feather name="calendar" size={iconSize} color={color} />;
    case 'Recipes':
      return <Feather name="book-open" size={iconSize} color={color} />;
    case 'Goals':
      return <Feather name="target" size={iconSize} color={color} />;
    case 'DesignSystem':
      return <Feather name="tool" size={iconSize} color={color} />;
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  focusedIconWrapper: {
    backgroundColor: COLORS.primary.main + '20',
    borderRadius: 16,
    padding: 8,
  },
});

const LightNavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.primary.main,
    background: COLORS.background.light,
    card: '#FFFFFF',
    text: COLORS.text.primary,
    border: '#E2E8F0',
    notification: COLORS.secondary.main,
  },
};

const DarkNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: COLORS.primary.main,
    background: COLORS.background.dark,
    card: COLORS.surface.primary,
    text: COLORS.text.primary,
    border: 'rgba(255,255,255,0.1)',
    notification: COLORS.secondary.main,
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
          tabBarActiveTintColor: COLORS.primary.main,
          tabBarInactiveTintColor: COLORS.text.tertiary,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            height: Platform.select({ ios: 88, android: 72 }),
            paddingBottom: Platform.select({ ios: 28, android: 12 }),
            paddingTop: 12,
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            position: 'absolute',
            ...ELEVATION.level3,
          },
          tabBarItemStyle: {
            paddingVertical: 4,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 2,
          },
          tabBarBackground,
          tabBarIcon: ({ color, focused }) => {
            const iconSize = focused ? TAB_ICON_SIZE.focused : TAB_ICON_SIZE.default;
            
            // Wrapper for focused state
            const IconWrapper = focused ? (
              <View style={styles.focusedIconWrapper}>
                {renderIcon(route.name, iconSize, color)}
              </View>
            ) : (
              renderIcon(route.name, iconSize, color)
            );
            
            return IconWrapper;
          },
        })}
      >
        <Tab.Screen name="Capture" component={CaptureScreen} options={{ title: 'Capture' }} />
        <Tab.Screen name="Community" component={CommunityScreen} options={{ title: 'Community' }} />
        <Tab.Screen name="Workouts" component={WorkoutsScreen} options={{ title: 'Workouts' }} />
        <Tab.Screen name="MealPlan" component={MealPlanScreen} options={{ title: 'Meals' }} />
        <Tab.Screen name="Recipes" component={RecipesScreen} options={{ title: 'Recipes' }} />
        <Tab.Screen name="Goals" component={GoalsScreen} options={{ title: 'Goals' }} />
        {__DEV__ && (
          <Tab.Screen name="DesignSystem" component={DesignSystemScreen} options={{ title: 'Design' }} />
        )}
      </Tab.Navigator>
    </NavigationContainer>
  );
};
