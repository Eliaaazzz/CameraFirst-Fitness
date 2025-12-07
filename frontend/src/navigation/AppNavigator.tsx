import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { Platform, useColorScheme, View } from 'react-native';

import { ErrorBoundary } from '@/components';
import { GoalsScreen } from '@/screens/GoalsScreen';
import { MealPlanScreen } from '@/screens/MealPlanScreen';
import { NutritionScreen } from '@/screens/NutritionScreen';
import { RecipeDetailScreen } from '@/screens/RecipeDetailScreen';
import { RecipesScreen } from '@/screens/RecipesScreen';
import { ResultsScreen } from '@/screens/ResultsScreen';
import { ReviewMealScreen } from '@/screens/ReviewMealScreen';
import { SearchScreen } from '@/screens/SearchScreen';
import { WorkoutsScreen } from '@/screens/WorkoutsScreen';
import { BRAND_COLORS, TAB_ICON_SIZE, useResponsive } from '@/utils';

// Wrap screens with ErrorBoundary to prevent white screen crashes
const withErrorBoundary = (Component: React.ComponentType<any>, screenName: string) => {
  return function WrappedScreen(props: any) {
    return (
      <ErrorBoundary>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};

const SafeSearchScreen = withErrorBoundary(SearchScreen, 'Search');
const SafeWorkoutsScreen = withErrorBoundary(WorkoutsScreen, 'Workouts');
const SafeRecipesScreen = withErrorBoundary(RecipesScreen, 'Recipes');
const SafeRecipeDetailScreen = withErrorBoundary(RecipeDetailScreen, 'RecipeDetail');
const SafeResultsScreen = withErrorBoundary(ResultsScreen, 'Results');
const SafeMealPlanScreen = withErrorBoundary(MealPlanScreen, 'MealPlan');
const SafeGoalsScreen = withErrorBoundary(GoalsScreen, 'Goals');
const SafeNutritionScreen = withErrorBoundary(NutritionScreen, 'Nutrition');
const SafeReviewMealScreen = withErrorBoundary(ReviewMealScreen, 'ReviewMeal');

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
  const { isDesktop, isTablet, isMobile, isWeb } = useResponsive();

  // Calculate responsive tab bar dimensions
  const tabBarHeight = isDesktop ? 70 : isTablet ? 65 : Platform.select({ ios: 60, android: 56 });
  const tabBarPaddingBottom = isDesktop ? 16 : isTablet ? 12 : Platform.select({ ios: 12, android: 8 });
  const tabBarPaddingTop = isDesktop ? 12 : 8;

  return (
    <NavigationContainer theme={colorScheme === 'dark' ? DarkNavigationTheme : LightNavigationTheme}>
      <Tab.Navigator
        initialRouteName="Search"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: BRAND_COLORS.primary,
          tabBarInactiveTintColor: BRAND_COLORS.tabInactive,
          tabBarHideOnKeyboard: true,
          // Show label text on desktop/tablet for better UX
          tabBarLabelStyle: {
            fontSize: isDesktop ? 13 : isTablet ? 12 : 11,
            fontWeight: '600',
          },
          tabBarStyle: {
            height: tabBarHeight,
            paddingBottom: tabBarPaddingBottom,
            paddingTop: tabBarPaddingTop,
            paddingHorizontal: isDesktop ? 32 : isTablet ? 16 : 0,
            backgroundColor: BRAND_COLORS.surface,
            borderTopWidth: 0,
            elevation: 10,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: -2 },
            // Add max-width constraint on desktop for centered tab bar
            ...(isDesktop && isWeb && {
              alignSelf: 'center',
              width: '100%',
              maxWidth: 1200,
            }),
          },
          tabBarBackground,
          tabBarIcon: ({ color, focused }) => {
            switch (route.name) {
              case 'Search':
                return (
                  <Feather
                    name="search"
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
              case 'Community':
                return (
                  <MaterialCommunityIcons
                    name={focused ? 'trophy' : 'trophy-outline'}
                    size={focused ? TAB_ICON_SIZE.focused : TAB_ICON_SIZE.default}
                    color={color}
                  />
                );
              case 'MealPlan':
                return (
                  <MaterialCommunityIcons
                    name={focused ? 'food-apple' : 'food-apple-outline'}
                    size={focused ? TAB_ICON_SIZE.focused : TAB_ICON_SIZE.default}
                    color={color}
                  />
                );
              case 'Goals':
                return (
                  <MaterialCommunityIcons
                    name={focused ? 'target' : 'target-variant'}
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
              case 'Nutrition':
                return (
                  <MaterialCommunityIcons
                    name={focused ? 'nutrition' : 'food-variant'}
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
        <Tab.Screen name="Search" component={SafeSearchScreen} options={{ title: 'Search' }} />
        <Tab.Screen name="Workouts" component={SafeWorkoutsScreen} options={{ title: 'Workouts' }} />
        <Tab.Screen name="Nutrition" component={SafeNutritionScreen} options={{ title: 'Nutrition' }} />
        <Tab.Screen name="MealPlan" component={SafeMealPlanScreen} options={{ title: 'Meal Plan' }} />
        <Tab.Screen name="Recipes" component={SafeRecipesScreen} options={{ title: 'Recipes' }} />
        <Tab.Screen name="Goals" component={SafeGoalsScreen} options={{ title: 'Goals' }} />
        <Tab.Screen
          name="Results"
          component={SafeResultsScreen}
          options={{
            title: 'Results',
            // Hide from the tab bar but keep routable for navigation
            tabBarButton: () => null,
          }}
        />
        <Tab.Screen
          name="RecipeDetail"
          component={SafeRecipeDetailScreen}
          options={{
            title: 'Recipe',
            // Hide from the tab bar but keep routable for navigation
            tabBarButton: () => null,
          }}
        />
        <Tab.Screen
          name="ReviewMeal"
          component={SafeReviewMealScreen}
          options={{
            title: 'Review Meal',
            // Hide from the tab bar but keep routable for navigation
            tabBarButton: () => null,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
