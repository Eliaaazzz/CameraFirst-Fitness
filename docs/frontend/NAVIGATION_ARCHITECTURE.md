# Navigation Architecture Documentation

## Overview

This document explains the navigation architecture used in the AuraFitness mobile application, built with React Navigation. The app uses a combination of **Stack Navigation** and **Tab Navigation** to create a seamless user experience.

## Table of Contents

1. [Navigation Types](#navigation-types)
2. [App Navigation Structure](#app-navigation-structure)
3. [Key Components](#key-components)
4. [createTabStackNavigator Factory Function](#createtabstacknavigator-factory-function)
5. [Tab Configuration](#tab-configuration)
6. [Web Compatibility](#web-compatibility)
7. [Usage Examples](#usage-examples)

---

## Navigation Types

### Stack Navigation
- Works like a **stack of cards** - new screens are placed on top
- Users can go **back** to previous screens
- Example: Recipe List → Recipe Detail → Back to List

### Tab Navigation
- **Bottom tabs** that allow switching between main sections
- Each tab represents a major feature area
- Example: Home | Workouts | Recipes | Profile

---

## App Navigation Structure

```
AppNavigator (Root Stack Navigator)
│
├── SplashScreen          (Initial loading screen)
├── LoginScreen           (Authentication)
│
└── MainTabs (Tab Navigator)
    │
    ├── Dashboard         (Single screen - Home tab)
    │
    ├── Workouts          (Single screen - Workouts tab)
    │
    ├── Recipes           (Stack Navigator - Recipes tab)
    │   ├── RecipesList
    │   └── RecipeDetail
    │
    └── Profile           (Stack Navigator - Profile tab)
        ├── ProfileMain
        ├── WeeklyInsights
        ├── MealHistory
        ├── SavedWorkouts
        └── SavedRecipes
```

---

## Key Components

### 1. AppNavigator
The root component that wraps the entire navigation structure.

```typescript
export const AppNavigator = () => {
  return (
    <NavigationContainer ref={navigationRef} theme={LightNavigationTheme}>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
```

### 2. MainTabs
The bottom tab navigator containing the four main sections of the app.

### 3. TabBarBackground
A custom component that renders the tab bar background with a subtle top border.

```typescript
const TabBarBackground = () => (
  <View style={tabBarStyles.background}>
    <View style={tabBarStyles.topBorder} />
  </View>
);
```

---

## createTabStackNavigator Factory Function

### Purpose
A **factory function** that creates Stack Navigators for tabs that need internal navigation (e.g., list → detail screens).

### Why Use a Factory Function?
1. **Code Reusability** - Avoid duplicating Stack Navigator setup code
2. **Consistent Configuration** - All tab stacks share the same settings
3. **Web Compatibility** - Centralized fix for Web platform issues

### Function Signature

```typescript
type StackScreenConfig = {
  name: string;                      // Screen identifier for navigation
  component: React.ComponentType<any>; // The React component to render
};

const createTabStackNavigator = (screens: StackScreenConfig[]) => {
  // Returns a React component that renders a Stack Navigator
};
```

### Implementation

```typescript
const createTabStackNavigator = (screens: StackScreenConfig[]) => {
  // Create a new Stack Navigator instance
  const TabStack = createStackNavigator();
  
  // Return a functional component
  return function TabStackScreen() {
    return (
      <TabStack.Navigator screenOptions={webCompatibleStackScreenOptions}>
        {/* Map through screens array and create Screen components */}
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
```

### How It Works

1. **Input**: An array of screen configurations
2. **Process**: Creates a Stack Navigator and registers each screen
3. **Output**: A React component that can be used as a Tab screen

```
Input:  [{ name: 'List', component: ListScreen }, { name: 'Detail', component: DetailScreen }]
                                    ↓
Process: createStackNavigator() + map screens to <Stack.Screen>
                                    ↓
Output:  <TabStackScreen> component ready to use in Tab.Navigator
```

---

## Tab Configuration

Tabs are configured using a declarative array structure:

```typescript
const TAB_CONFIG = [
  {
    name: 'Dashboard',                    // Route name
    component: SafeDashboardScreen,       // Screen component
    label: 'Home',                        // Display label
    iconActive: 'home',                   // Icon when selected
    iconInactive: 'home-outline',         // Icon when not selected
    iconFamily: 'MaterialCommunityIcons', // Icon library
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
    component: RecipesStackScreen,        // Note: Stack Navigator, not single screen
    label: 'Recipes',
    iconActive: 'book-open-variant',
    iconInactive: 'book-open-outline',
    iconFamily: 'MaterialCommunityIcons',
  },
  {
    name: 'Profile',
    component: ProfileStackScreen,        // Note: Stack Navigator, not single screen
    label: 'Profile',
    iconActive: 'user',
    iconInactive: 'user',
    iconFamily: 'Feather',
  },
];
```

---

## Web Compatibility

### The Problem
On Web platform, Stack Navigator's card container can collapse to height 0, breaking FlatList/ScrollView scrolling.

### The Solution
Apply `cardStyle: { flex: 1 }` to all Stack screens:

```typescript
const webCompatibleStackScreenOptions = {
  headerShown: false,      // Hide default header
  cardStyle: { flex: 1 },  // CRITICAL: Prevents height collapse on Web
};
```

### Platform-Specific Tab Bar Styling

```typescript
tabBarStyle: {
  // Common styles...
  
  // Platform-specific positioning
  ...(isWeb
    ? {
        // Web: use flexbox for even distribution
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        width: '100%',
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
      }
    : {
        // Native: absolute positioning
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
      }),
}
```

---

## Usage Examples

### Example 1: Creating a Tab with Internal Navigation

```typescript
// Define the screens for the Recipes tab
const RecipesStackScreen = createTabStackNavigator([
  { name: 'RecipesList', component: SafeRecipesScreen },
  { name: 'RecipeDetail', component: SafeRecipeDetailScreen },
]);

// Use in Tab.Navigator
<Tab.Screen
  name="Recipes"
  component={RecipesStackScreen}
  options={{ title: 'Recipes' }}
/>
```

### Example 2: Navigating Within a Tab Stack

```typescript
// In RecipesScreen.tsx
const RecipesScreen = ({ navigation }) => {
  const handleRecipePress = (recipeId: string) => {
    // Navigate to detail screen within the same tab
    navigation.navigate('RecipeDetail', { id: recipeId });
  };
  
  return (
    <FlatList
      data={recipes}
      renderItem={({ item }) => (
        <RecipeCard onPress={() => handleRecipePress(item.id)} />
      )}
    />
  );
};
```

### Example 3: Navigating to a Different Tab

```typescript
// From any screen, navigate to a different tab
navigation.navigate('Profile');

// Navigate to a specific screen within another tab
navigation.navigate('Profile', {
  screen: 'WeeklyInsights',
  params: { weekId: '2024-01' },
});
```

### Example 4: Hidden Screens (No Tab Button)

```typescript
// Screens accessible via navigation but not shown in tab bar
<Tab.Screen
  name="Results"
  component={SafeResultsScreen}
  options={{
    title: 'Results',
    tabBarButton: () => null,           // Hide tab button
    tabBarItemStyle: { display: 'none' }, // Hide tab item
    tabBarStyle: { display: 'none' },    // Hide entire tab bar on this screen
  }}
/>
```

---

## Error Handling

All screens are wrapped with an ErrorBoundary to prevent white screen crashes:

```typescript
const withErrorBoundary = (Component: React.ComponentType<any>, screenName: string) => {
  return function WrappedScreen(props: any) {
    return (
      <ErrorBoundary>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};

// Usage
const SafeDashboardScreen = withErrorBoundary(DashboardScreen, 'Dashboard');
```

---

## Best Practices

1. **Use createTabStackNavigator** for tabs that need internal navigation
2. **Wrap screens with ErrorBoundary** to prevent crashes
3. **Use TAB_CONFIG array** for declarative tab configuration
4. **Apply webCompatibleStackScreenOptions** for cross-platform compatibility
5. **Use responsive hooks** (`useResponsive`) for adaptive layouts
6. **Calculate safe area insets** for proper spacing on notched devices

---

## Related Files

- `frontend/src/navigation/AppNavigator.tsx` - Main navigation configuration
- `frontend/src/navigation/navigationService.ts` - Navigation utilities
- `frontend/src/utils/tabBar.ts` - Tab bar height calculations
- `frontend/src/utils/responsive.ts` - Responsive design utilities