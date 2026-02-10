import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { navigationRef } from './navigationService';

import { ErrorBoundary } from '@/components';
import { Sidebar } from '@/components/layout';
import DashboardScreen from '@/screens/DashboardScreen';
import LoginScreen from '@/screens/LoginScreen';
import RegisterScreen from '@/screens/RegisterScreen';
import { MealHistoryScreen } from '@/screens/MealHistoryScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import { RecipeDetailScreen } from '@/screens/RecipeDetailScreen';
import { RecipesScreen } from '@/screens/RecipesScreen';
import { ResultsScreen } from '@/screens/ResultsScreen';
import { ReviewMealScreen } from '@/screens/ReviewMealScreen';
import { SavedRecipesScreen } from '@/screens/SavedRecipesScreen';
import { SavedWorkoutsScreen } from '@/screens/SavedWorkoutsScreen';
import SplashScreen from '@/screens/SplashScreen';
import { WeeklyInsightsScreen } from '@/screens/WeeklyInsightsScreen';
import { WorkoutsScreen } from '@/screens/WorkoutsScreen';
import { BRAND_COLORS, TAB_ICON_SIZE, useResponsive, useSidebarVisible } from '@/utils';

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
const SafeMealHistoryScreen = withErrorBoundary(MealHistoryScreen, 'MealHistory');
const SafeWeeklyInsightsScreen = withErrorBoundary(WeeklyInsightsScreen, 'WeeklyInsights');
const SafeSavedWorkoutsScreen = withErrorBoundary(SavedWorkoutsScreen, 'SavedWorkouts');
const SafeSavedRecipesScreen = withErrorBoundary(SavedRecipesScreen, 'SavedRecipes');

const Tab = createBottomTabNavigator();
// Use createStackNavigator instead of createNativeStackNavigator for Web compatibility
const Stack = createStackNavigator();

/**
 * Tab bar background with subtle top border
 * Creates layered appearance without "floating" effect
 */
const TabBarBackground = () => (
  <View style={tabBarStyles.background}>
    <View style={tabBarStyles.topBorder} />
  </View>
);

const tabBarStyles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BRAND_COLORS.surface,
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});

// Desktop layout styles
const styles = StyleSheet.create({
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContent: {
    flex: 1,
  },
});

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

/**
 * Web-compatible Stack screen options
 *
 * IMPORTANT: `cardStyle: { flex: 1 }` is critical for Web platform.
 * Without this, the Stack Navigator's card container collapses to height 0,
 * breaking FlatList/ScrollView scrolling.
 *
 * This is the industry standard pattern for Tab > Stack > Screen architecture.
 * Native platforms handle this automatically, but Web requires explicit flex.
 */
const webCompatibleStackScreenOptions = {
  headerShown: false,
  cardStyle: { flex: 1 },
};

/**
 * Creates a Stack Navigator wrapper for a tab with detail screens.
 * Use this factory function to ensure consistent Web-compatible configuration.
 *
 * @example
 * const RecipesStackScreen = createTabStackNavigator([
 *   { name: 'RecipesList', component: RecipesScreen },
 *   { name: 'RecipeDetail', component: RecipeDetailScreen },
 * ]);
 */
type StackScreenConfig = {
  name: string;
  component: React.ComponentType<any>;
};

const createTabStackNavigator = (screens: StackScreenConfig[]) => {
  const TabStack = createStackNavigator();
  return function TabStackScreen() {
    return (
      <TabStack.Navigator screenOptions={webCompatibleStackScreenOptions}>
        {screens.map((screen) => (
          <TabStack.Screen
            key={screen.name}
            name={screen.name}
            component={screen.component}
          />
        ))}
      </TabStack.Navigator>
    );
  };
};

// Stack navigator for Recipes tab: RecipesList -> RecipeDetail
const RecipesStackScreen = createTabStackNavigator([
  { name: 'RecipesList', component: SafeRecipesScreen },
  { name: 'RecipeDetail', component: SafeRecipeDetailScreen },
]);

// Stack navigator for Profile tab: Profile -> WeeklyInsights / MealHistory / SavedWorkouts / SavedRecipes
const ProfileStackScreen = createTabStackNavigator([
  { name: 'ProfileMain', component: SafeProfileScreen },
  { name: 'WeeklyInsights', component: SafeWeeklyInsightsScreen },
  { name: 'MealHistory', component: SafeMealHistoryScreen },
  { name: 'SavedWorkouts', component: SafeSavedWorkoutsScreen },
  { name: 'SavedRecipes', component: SafeSavedRecipesScreen },
]);

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
    name: 'Capture',
    component: SafeDashboardScreen, // Placeholder - actual action handled by custom button
    label: '',
    iconActive: 'camera',
    iconInactive: 'camera',
    iconFamily: 'MaterialCommunityIcons',
    isCamera: true, // Special flag for camera button
  },
  {
    name: 'Recipes',
    component: RecipesStackScreen, // Use Stack navigator for proper navigation hierarchy
    label: 'Recipes',
    iconActive: 'book-open-variant',
    iconInactive: 'book-open-outline',
    iconFamily: 'MaterialCommunityIcons',
  },
  {
    name: 'Profile',
    component: ProfileStackScreen, // Stack navigator for Profile -> WeeklyInsights / MealHistory
    label: 'Profile',
    iconActive: 'user',
    iconInactive: 'user',
    iconFamily: 'Feather',
  },
];

// Custom camera button component for bottom tab
interface CameraTabButtonProps {
  onPress: () => void;
}

const CameraTabButton = ({ onPress }: CameraTabButtonProps) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      cameraButtonStyles.container,
      pressed && cameraButtonStyles.pressed,
    ]}
  >
    <LinearGradient
      colors={[BRAND_COLORS.primary, '#A78BFA']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={cameraButtonStyles.gradient}
    >
      <MaterialCommunityIcons name="camera" size={28} color="#FFFFFF" />
    </LinearGradient>
  </Pressable>
);

const cameraButtonStyles = StyleSheet.create({
  container: {
    position: 'relative',
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BRAND_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
  },
  gradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
});

const MainTabs = () => {
  const { isDesktop, isTablet, isWeb } = useResponsive();
  const showSidebar = useSidebarVisible();
  const insets = useSafeAreaInsets();

  // Calculate safe tab bar height with proper bottom inset
  const baseTabBarHeight = isDesktop ? 60 : isTablet ? 56 : 52;
  const tabBarPaddingBottom = Platform.select({
    ios: Math.max(insets.bottom, 8) + 4,
    android: Math.max(insets.bottom, 8) + 4,
    default: 12, // web
  });
  const tabBarHeight = baseTabBarHeight + tabBarPaddingBottom;
  const tabBarPaddingTop = 8;

  const getTabBarIcon = (routeName: string, focused: boolean, color: string) => {
    const config = TAB_CONFIG.find(t => t.name === routeName);
    if (!config) return null;

    // Camera button has custom rendering
    if ((config as any).isCamera) {
      return null;
    }

    const iconName = focused ? config.iconActive : config.iconInactive;
    const size = focused ? TAB_ICON_SIZE.focused : TAB_ICON_SIZE.default;

    // Render icon without indicator bar (clean design)
    if (config.iconFamily === 'Feather') {
      return <Feather name={iconName as any} size={size} color={color} />;
    }
    return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
  };

  // Desktop layout with sidebar - filter out the Capture tab
  const desktopTabs = TAB_CONFIG.filter(tab => !(tab as any).isCamera);

  if (showSidebar) {
    return (
      <View style={styles.desktopContainer}>
        <Sidebar />
        <View style={styles.mainContent}>
          <Tab.Navigator
            initialRouteName="Dashboard"
            screenOptions={{
              headerShown: false,
              tabBarStyle: { display: 'none' }, // Hide tab bar on desktop
            }}
          >
            {desktopTabs.map((tab) => (
              <Tab.Screen
                key={tab.name}
                name={tab.name}
                component={tab.component}
                options={{ title: tab.label }}
              />
            ))}

            {/* Hidden screens */}
            <Tab.Screen
              name="Results"
              component={SafeResultsScreen}
              options={{ tabBarButton: () => null }}
            />
            <Tab.Screen
              name="ReviewMeal"
              component={SafeReviewMealScreen}
              options={{ tabBarButton: () => null }}
            />
          </Tab.Navigator>
        </View>
      </View>
    );
  }

  // Mobile layout with bottom tabs
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: BRAND_COLORS.primary,
        tabBarInactiveTintColor: BRAND_COLORS.tabInactive,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: isDesktop ? 11 : 10,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarItemStyle: {
          flex: 1,
          minHeight: 44,
          paddingTop: 0,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarStyle: {
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: tabBarPaddingTop,
          backgroundColor: BRAND_COLORS.surface,
          borderTopWidth: 0,
          // Subtle shadow for elevation
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
          elevation: 8,
          // Platform-specific positioning and layout
          ...(isWeb
            ? {
                // Web: use flexbox for even distribution
                display: 'flex' as const,
                flexDirection: 'row' as const,
                justifyContent: 'space-around' as const,
                alignItems: 'center' as const,
                width: '100%',
                position: 'absolute' as const,
                left: 0,
                right: 0,
                bottom: 0,
              }
            : {
                // Native: absolute positioning
                position: 'absolute' as const,
                left: 0,
                right: 0,
                bottom: 0,
              }),
        },
        tabBarBackground: TabBarBackground,
        tabBarIcon: ({ focused, color }) => getTabBarIcon(route.name, focused, color),
      })}
    >
      {TAB_CONFIG.map((tab) => {
        const isCamera = (tab as any).isCamera;
        return (
          <Tab.Screen
            key={tab.name}
            name={tab.name}
            component={tab.component}
            options={({ navigation }) => ({
              title: tab.label,
              tabBarLabel: isCamera ? () => null : tab.label,
              tabBarButton: isCamera
                ? () => (
                    <CameraTabButton
                      onPress={() => navigation.navigate('ReviewMeal', { openCamera: true })}
                    />
                  )
                : undefined,
            })}
            listeners={({ navigation }) => ({
              tabPress: (e) => {
                if (isCamera) {
                  e.preventDefault();
                  navigation.navigate('ReviewMeal', { openCamera: true });
                }
              },
            })}
          />
        );
      })}

      {/* Hidden screens - accessible via navigation but not shown in tab bar */}
      <Tab.Screen
        name="Results"
        component={SafeResultsScreen}
        options={{
          title: 'Results',
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="ReviewMeal"
        component={SafeReviewMealScreen}
        options={{
          title: 'Review Meal',
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
          tabBarStyle: { display: 'none' },
        }}
      />
      {/* MealHistory and WeeklyInsights are now in ProfileStackScreen */}
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  // Always use light mode
  return (
    <NavigationContainer ref={navigationRef} theme={LightNavigationTheme}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
