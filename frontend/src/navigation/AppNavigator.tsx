import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  BottomTabBar,
  createBottomTabNavigator,
  type BottomTabBarButtonProps,
} from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer, useIsFocused } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Platform,
  Pressable,
  type PressableStateCallbackType,
  Text as RNText,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
 * Liquid Glass Tab Bar Background
 *
 * Recreates Apple's iOS 26 Liquid Glass material:
 * 1. Deep blur layer (lensing) – refracts ambient content below
 * 2. Semi-transparent white tint – the "glass" body
 * 3. Top-edge specular highlight – simulates light hitting the glass surface
 * 4. Thin inner stroke – defines the glass boundary
 *
 * The tab bar floats above content with a soft, diffused shadow.
 */
const TabBarBackground = () => (
  <View style={tabBarStyles.shell}>
    {Platform.OS === 'web' ? (
      <View style={tabBarStyles.webFallbackBlur} />
    ) : (
      <BlurView intensity={56} tint="systemChromeMaterialLight" style={tabBarStyles.blurLayer} />
    )}
    {/* Glass body tint */}
    <LinearGradient
      colors={['rgba(255,255,255,0.72)', 'rgba(255,248,241,0.56)']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={tabBarStyles.tintLayer}
    />
    {/* Top specular highlight – light hitting the glass edge */}
    <LinearGradient
      colors={['rgba(255,255,255,0.78)', 'rgba(255,255,255,0)']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={tabBarStyles.topSpecular}
    />
    {/* Inner edge stroke */}
    <View style={tabBarStyles.outline} />
  </View>
);

/**
 * Active tab indicator – a pill-shaped glass capsule behind the icon.
 * Uses a lighter glass fill with inner stroke, matching Apple's tab selection.
 */
const TabIconShell = ({ focused, children }: { focused: boolean; children: React.ReactNode }) => (
  <View style={[tabBarStyles.iconShell, focused && tabBarStyles.iconShellFocused]}>
    {children}
  </View>
);

const TabBarLabel = ({ focused, label }: { focused: boolean; label: string }) => (
  <RNText
    allowFontScaling
    maxFontSizeMultiplier={1.1}
    style={[tabBarStyles.label, focused ? tabBarStyles.labelFocused : tabBarStyles.labelInactive]}
  >
    {label}
  </RNText>
);

const tabBarStyles = StyleSheet.create({
  frame: {
    width: '92%',
    minWidth: 0,
  },
  shell: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    overflow: 'hidden',
  },
  blurLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  webFallbackBlur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.58)',
    backdropFilter: 'blur(40px)',
    WebkitBackdropFilter: 'blur(40px)',
  } as any,
  tintLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  topSpecular: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 12,
  },
  outline: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.52)',
  },
  iconShell: {
    width: 42,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  iconShellFocused: {
    backgroundColor: 'rgba(255,255,255,0.54)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.68)',
  },
  label: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 0.15,
    marginTop: 2,
    paddingBottom: 1,
    textAlign: 'center',
  },
  labelFocused: {
    color: BRAND_COLORS.primaryDark,
  },
  labelInactive: {
    color: '#334155',
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
/**
 * Camera FAB – Liquid Glass floating action button.
 * Uses the same glass material as the tab bar but with a warm brand tint
 * that "shines through" the translucent surface.
 */
type CameraTabButtonProps = Partial<BottomTabBarButtonProps>;

const CameraTabButton = ({
  children: _children,
  style,
  onPress,
  onLongPress,
  testID,
  accessibilityLabel,
  accessibilityState,
  role,
  android_ripple,
}: CameraTabButtonProps) => (
  <Pressable
    onPress={onPress}
    onLongPress={onLongPress}
    testID={testID}
    accessibilityLabel={accessibilityLabel}
    accessibilityState={accessibilityState}
    role={role as any}
    android_ripple={android_ripple}
    style={({ pressed }: PressableStateCallbackType) => [
      style,
      cameraButtonStyles.button,
      cameraButtonStyles.container,
      pressed && cameraButtonStyles.pressed,
    ]}
  >
    <View style={cameraButtonStyles.shell}>
      <BlurView intensity={60} tint="systemChromeMaterialLight" style={StyleSheet.absoluteFillObject} />
      {/* Brand color tints through the glass */}
      <LinearGradient
        colors={['rgba(255,255,255,0.68)', 'rgba(249,115,22,0.28)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Specular highlight crescent */}
      <View style={cameraButtonStyles.specular} />
      <MaterialCommunityIcons name="camera" size={26} color={BRAND_COLORS.primaryDark} />
    </View>
  </Pressable>
);

const cameraButtonStyles = StyleSheet.create({
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: 'transparent',
  },
  container: {
    position: 'relative',
    top: -22,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'transparent',
    // Deeper, more diffused shadow for glass float
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 0,
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
  shell: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  specular: {
    position: 'absolute',
    top: 4,
    left: 12,
    right: 12,
    height: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.54)',
  },
});

const MainTabs = () => {
  const { isDesktop, isTablet, isWeb } = useResponsive();
  const showSidebar = useSidebarVisible();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const tabBarLabelFontSize = isDesktop ? 11 : 12;
  const tabBarLabelLineHeight = tabBarLabelFontSize + 2;
  // Calculate safe tab bar height with proper bottom inset
  // Keep extra vertical room for the custom glass icon shell and tab label stack.
  const baseTabBarHeight = isDesktop ? 68 : isTablet ? 76 : 76;
  const tabBarPaddingBottom = Platform.select({
    ios: Math.max(insets.bottom, 4) + 2,
    android: Math.max(insets.bottom, 4) + 2,
    default: 8, // web
  });
  const tabBarHeight = baseTabBarHeight + tabBarPaddingBottom;
  const tabBarPaddingTop = 10;
  // Two-layer approach:
  // - Outer wrapper: position + centering only (left:0, right:0, alignItems:'center')
  // - Inner frame: width constraint only
  // - BottomTabBar: visuals only
  // React Navigation's internal BottomTabBar root still carries start/end positioning,
  // so keeping width on a parent frame avoids the right-shift drift.
  const renderTabBar = (props: React.ComponentProps<typeof BottomTabBar>) => (
    !isFocused ? null : (
    <View
      pointerEvents="box-none"
      style={{
        position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as 'absolute',
        left: 0,
        right: 0,
        bottom: isWeb ? 12 : 8,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        width: '100%',
      }}
    >
      <View style={[tabBarStyles.frame, { maxWidth: isWeb ? 560 : 520, alignSelf: 'center' }]}>
        <BottomTabBar {...props} />
      </View>
    </View>
    )
  );

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
      return (
        <TabIconShell focused={focused}>
          <Feather name={iconName as any} size={size} color={color} />
        </TabIconShell>
      );
    }
    return (
      <TabIconShell focused={focused}>
        <MaterialCommunityIcons name={iconName as any} size={size} color={color} />
      </TabIconShell>
    );
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
          </Tab.Navigator>
        </View>
      </View>
    );
  }

  // Mobile layout with bottom tabs
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      safeAreaInsets={{ left: 0, right: 0, top: 0, bottom: 0 }}
      tabBar={renderTabBar}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: BRAND_COLORS.primaryDark,
        tabBarInactiveTintColor: '#334155',
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: true,
        tabBarLabelPosition: 'below-icon',
        tabBarLabelStyle: {
          fontSize: tabBarLabelFontSize,
          lineHeight: tabBarLabelLineHeight,
          fontWeight: '700',
          marginTop: 4,
          letterSpacing: 0.2,
          paddingBottom: 1,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        tabBarItemStyle: {
          flex: 1,
          minHeight: 56,
          paddingTop: 2,
          paddingBottom: 0,
        },
        tabBarStyle: {
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: tabBarPaddingTop,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          borderRadius: 28,
          shadowColor: '#0F172A',
          shadowOpacity: 0.14,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 10 },
          elevation: 0,
          width: '100%',
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
              tabBarLabel: isCamera
                ? () => null
                : ({ focused }) => <TabBarLabel focused={focused} label={tab.label} />,
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
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  // Always use light mode
  return (
    <NavigationContainer ref={navigationRef} theme={LightNavigationTheme}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={webCompatibleStackScreenOptions}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Results" component={SafeResultsScreen} />
        <Stack.Screen name="ReviewMeal" component={SafeReviewMealScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
