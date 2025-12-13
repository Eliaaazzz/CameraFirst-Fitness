import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Platform, useColorScheme, View } from 'react-native';

import { ErrorBoundary, AuthGuard } from '@/components';
import DashboardScreen from '@/screens/DashboardScreen';
import LoginScreen from '@/screens/LoginScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import { RecipeDetailScreen } from '@/screens/RecipeDetailScreen';
import { RecipesScreen } from '@/screens/RecipesScreen';
import { ResultsScreen } from '@/screens/ResultsScreen';
import { ReviewMealScreen } from '@/screens/ReviewMealScreen';
import SplashScreen from '@/screens/SplashScreen';
import { WorkoutsScreen } from '@/screens/WorkoutsScreen';
import { BRAND_COLORS, TAB_ICON_SIZE, useResponsive } from '@/utils';

// Wrap screens with ErrorBoundary to prevent white screen crashes
const withErrorBoundary = (Component: React.ComponentType<any>, _screenName: string) => {
  return function WrappedScreen(props: any) {
    return (
      <ErrorBoundary>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};

const SafeDashboardScreen = withErrorBoundary(DashboardScreen, 'Dashboard');
const SafeWorkoutsScreen = withErrorBoundary(WorkoutsScreen, 'Workouts');
const SafeRecipesScreen = withErrorBoundary(RecipesScreen, 'Recipes');
const SafeProfileScreen = withErrorBoundary(ProfileScreen, 'Profile');
const SafeRecipeDetailScreen = withErrorBoundary(RecipeDetailScreen, 'RecipeDetail');
const SafeResultsScreen = withErrorBoundary(ResultsScreen, 'Results');
const SafeReviewMealScreen = withErrorBoundary(ReviewMealScreen, 'ReviewMeal');

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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

// Tab configuration for cleaner code
const TAB_CONFIG = [
  {
    name: 'Dashboard',
    component: SafeDashboardScreen,
    label: 'Home',
    iconActive: 'home',
    iconInactive: 'home-outline',
    iconFamily: 'MaterialCommunityIcons',
  },
  {
    name: 'Workouts',
    component: SafeWorkoutsScreen,
    label: 'Workouts',
    iconActive: 'dumbbell',
    iconInactive: 'dumbbell',
    iconFamily: 'MaterialCommunityIcons',
  },
  {
    name: 'Recipes',
    component: SafeRecipesScreen,
    label: 'Recipes',
    iconActive: 'book-open-variant',
    iconInactive: 'book-open-outline',
    iconFamily: 'MaterialCommunityIcons',
  },
  {
    name: 'Profile',
    component: SafeProfileScreen,
    label: 'Profile',
    iconActive: 'user',
    iconInactive: 'user',
    iconFamily: 'Feather',
  },
];

const MainTabs = () => {
  const { isDesktop, isTablet, isWeb } = useResponsive();

  // Calculate responsive tab bar dimensions
  const tabBarHeight = isDesktop ? 70 : isTablet ? 65 : Platform.select({ ios: 85, android: 65 });
  const tabBarPaddingBottom = isDesktop ? 16 : isTablet ? 12 : Platform.select({ ios: 28, android: 10 });
  const tabBarPaddingTop = isDesktop ? 12 : 8;

  const getTabBarIcon = (routeName: string, focused: boolean, color: string) => {
    const config = TAB_CONFIG.find(t => t.name === routeName);
    if (!config) return null;

    const iconName = focused ? config.iconActive : config.iconInactive;
    const size = focused ? TAB_ICON_SIZE.focused : TAB_ICON_SIZE.default;

    if (config.iconFamily === 'Feather') {
      return <Feather name={iconName as any} size={size} color={color} />;
    }
    return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
  };

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: BRAND_COLORS.primary,
        tabBarInactiveTintColor: BRAND_COLORS.tabInactive,
        tabBarHideOnKeyboard: true,
        // Fixed: Ensure labels don't truncate
        tabBarLabelStyle: {
          fontSize: isDesktop ? 12 : isTablet ? 11 : 10,
          fontWeight: '600',
          marginTop: 2,
        },
        // Fixed: Even distribution of tabs - use minWidth to ensure equal sizing
        tabBarItemStyle: {
          flex: 1,
          minWidth: 60,
          paddingTop: 4,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarStyle: {
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: tabBarPaddingTop,
          // Remove horizontal padding to ensure full-width even distribution
          paddingHorizontal: 0,
          backgroundColor: BRAND_COLORS.surface,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
          // Ensure the tab bar items container uses flexbox properly
          flexDirection: 'row',
          justifyContent: 'space-evenly',
          // Add max-width constraint on desktop for centered tab bar
          ...(isDesktop && isWeb && {
            alignSelf: 'center',
            width: '100%',
            maxWidth: 1200,
            paddingHorizontal: 32,
          }),
        },
        tabBarBackground,
        tabBarIcon: ({ focused, color }) => getTabBarIcon(route.name, focused, color),
      })}
    >
      {TAB_CONFIG.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{ title: tab.label }}
        />
      ))}

      {/* Hidden screens - accessible via navigation but not shown in tab bar */}
      <Tab.Screen
        name="Results"
        component={SafeResultsScreen}
        options={{
          title: 'Results',
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="RecipeDetail"
        component={SafeRecipeDetailScreen}
        options={{
          title: 'Recipe',
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="ReviewMeal"
        component={SafeReviewMealScreen}
        options={{
          title: 'Review Meal',
          tabBarButton: () => null,
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const colorScheme = useColorScheme();

  return (
    <NavigationContainer theme={colorScheme === 'dark' ? DarkNavigationTheme : LightNavigationTheme}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
