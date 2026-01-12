# Navigation & ListScreen Guide

## Problem Background

On Web platform, nesting Stack Navigator inside Tab Navigator **without proper styling** breaks the flex layout chain, causing FlatList/ScrollView to not scroll.

## Industry Standard: Tab > Stack > Screen

**Tab > Stack > Screen is the correct architecture**. The issue is not the nesting itself, but missing Web platform style adaptation.

### Solution: Add `cardStyle: { flex: 1 }`

```tsx
// ✅ Correct: Web-compatible Stack Navigator configuration
const webCompatibleStackScreenOptions = {
  headerShown: false,
  cardStyle: { flex: 1 }, // Critical! Ensures content area fills available space
};
```

### Why `cardStyle: { flex: 1 }` is needed?

In React Navigation's Stack Navigator:
- **Native**: Content fills screen automatically
- **Web**: Card container may collapse to height 0

`cardStyle: { flex: 1 }` ensures the Stack's card container properly propagates flex layout.

## Factory Function (Recommended)

Use `createTabStackNavigator` factory function for consistent configuration:

```tsx
// Already defined in AppNavigator.tsx
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

// Usage examples:
const RecipesStackScreen = createTabStackNavigator([
  { name: 'RecipesList', component: SafeRecipesScreen },
  { name: 'RecipeDetail', component: SafeRecipeDetailScreen },
]);

const ProfileStackScreen = createTabStackNavigator([
  { name: 'ProfileMain', component: SafeProfileScreen },
  { name: 'WeeklyInsights', component: SafeWeeklyInsightsScreen },
  { name: 'MealHistory', component: SafeMealHistoryScreen },
]);
```

## Complete Architecture

```
NavigationContainer
  └── Stack.Navigator (Root)
        └── Tab.Navigator (Main)
              ├── Tab.Screen "Dashboard" → DashboardScreen
              ├── Tab.Screen "Workouts" → WorkoutsScreen
              ├── Tab.Screen "Recipes" → RecipesStackScreen
              │     └── Stack.Navigator (cardStyle: { flex: 1 })
              │           ├── "RecipesList" → RecipesScreen
              │           └── "RecipeDetail" → RecipeDetailScreen
              ├── Tab.Screen "Profile" → ProfileStackScreen
              │     └── Stack.Navigator (cardStyle: { flex: 1 })
              │           ├── "ProfileMain" → ProfileScreen
              │           ├── "WeeklyInsights" → WeeklyInsightsScreen
              │           └── "MealHistory" → MealHistoryScreen
              └── Hidden Tab.Screens (Results, ReviewMeal, etc.)
```

## Quick Start

### 1. Use the factory function

```tsx
// AppNavigator.tsx
const MyStackScreen = createTabStackNavigator([
  { name: 'MyList', component: MyListScreen },
  { name: 'MyDetail', component: MyDetailScreen },
]);
```

### 2. Add to TAB_CONFIG

```tsx
const TAB_CONFIG = [
  { name: 'MyTab', component: MyStackScreen, ... },
];
```

## Screen 组件结构

```tsx
// styles 定义在组件外部
const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { gap: spacing.md },
});

// ItemSeparator 定义在组件外部
const ItemSeparator = () => <View style={{ height: spacing.md }} />;

// 组件结构
export const ItemsScreen = () => {
  return (
    <SafeAreaWrapper>
      <Container style={styles.container}>
        <FlatList
          data={data}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom }]}
          ItemSeparatorComponent={ItemSeparator}
          ListHeaderComponent={listHeaderComponent}
          ListEmptyComponent={listEmptyComponent}
          refreshControl={...}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />
      </Container>
      <FAB ... />
    </SafeAreaWrapper>
  );
};
```

## 核心原则

1. **Tab > Stack > Screen 是标准架构** - 不要为了避免嵌套而扁平化
2. **Stack Navigator 必须添加 `cardStyle: { flex: 1 }`** - Web 端关键修复
3. **styles 和 ItemSeparator 定义在组件外部** - 避免每次渲染重新创建
4. **使用 SafeAreaWrapper > Container > FlatList 结构** - 保证正确的 flex 链

## 参考文件

- Navigation 配置：`frontend/src/navigation/AppNavigator.tsx`
- 成功案例：`frontend/src/screens/WorkoutsScreen.tsx`
- 封装组件：`frontend/src/components/common/ListScreen.tsx`
