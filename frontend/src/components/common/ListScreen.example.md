# ListScreen 使用指南

## 问题背景

在 Web 端，如果在 Tab 内嵌套 Stack Navigator，会破坏 flex 布局链，导致 FlatList 无法滚动。

**错误模式：**
```
Tab.Navigator
  └── Stack.Navigator (额外嵌套 - 导致滚动失效!)
        └── Screen
              └── FlatList
```

**正确模式：**
```
Tab.Navigator
  └── Tab.Screen (直接挂载)
        └── FlatList
```

## 快速使用

### 1. 配置 Navigation（关键！）

```tsx
// AppNavigator.tsx

// ❌ 错误：不要嵌套 Stack Navigator
const ItemsStack = createStackNavigator();
const ItemsStackScreen = () => (
  <ItemsStack.Navigator>
    <ItemsStack.Screen name="ItemsList" component={ItemsScreen} />
    <ItemsStack.Screen name="ItemDetail" component={ItemDetailScreen} />
  </ItemsStack.Navigator>
);

// ✅ 正确：直接作为 Tab.Screen
const TAB_CONFIG = [
  { name: 'Items', component: SafeItemsScreen, ... },
];

// Detail 页面放在隐藏的 Tab.Screen
<Tab.Screen
  name="ItemDetail"
  component={SafeItemDetailScreen}
  options={{
    tabBarButton: () => null,
    tabBarItemStyle: { display: 'none' },
    tabBarStyle: { display: 'none' },
  }}
/>
```

### 2. 使用 ListScreen 组件

```tsx
import { ListScreen } from '@/components/common/ListScreen';

export const MyItemsScreen = () => {
  // ... hooks and state

  return (
    <ListScreen
      title="Items"
      subtitle="Your items and recommendations."
      items={savedItems}
      savedItemIds={savedItemIds}
      recommendedItems={recommendedItems}
      searchResults={searchResults}
      isLoading={isLoading}
      isError={isError}
      isRefreshing={isRefreshing}
      isSearching={isSearching}
      searchQuery={searchQuery}
      searchPlaceholder="Search items..."
      searchSuggestions={ITEM_SUGGESTIONS}
      onSearch={handleSearch}
      onClearSearch={clearSearch}
      onRefresh={handleRefresh}
      onRetry={handleRetry}
      tourZone={7}
      tourText="Search for items here"
      renderItem={(item) => <ItemCard item={item} />}
      renderSearchResultItem={(item, isSaved) => <ItemCard item={item} isSaved={isSaved} />}
      renderRecommendedItem={(item, isSaved) => <ItemCard item={item} isSaved={isSaved} />}
      renderEmptyIcon={() => <Icon name="inbox" size={32} />}
      renderErrorIcon={() => <Icon name="alert" size={32} />}
      getItemId={(item) => item.id}
      getSearchResultId={(item) => item.id}
      getRecommendedId={(item) => item.id}
      emptyTitle="Your saved items will appear here"
      savedSectionTitle="Saved Items"
    />
  );
};
```

### 3. 或者直接复制 WorkoutsScreen 结构

如果不想用封装组件，直接复制 `WorkoutsScreen.tsx` 的结构：

```tsx
// 1. styles 定义在组件外部
const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { gap: spacing.md },
  // ...
});

// 2. ItemSeparator 定义在组件外部
const ItemSeparator = () => <View style={{ height: spacing.md }} />;

// 3. 组件结构
export const MyScreen = () => {
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

1. **不要在 Tab 内嵌套 Stack Navigator** - 会破坏 Web 端 flex 布局
2. **styles 和 ItemSeparator 定义在组件外部** - 避免每次渲染重新创建
3. **Detail 页面用隐藏的 Tab.Screen** - 设置 `tabBarButton: () => null`
4. **使用 SafeAreaWrapper > Container > FlatList 结构** - 保证正确的 flex 链

## 参考文件

- 成功案例：`frontend/src/screens/WorkoutsScreen.tsx`
- 封装组件：`frontend/src/components/common/ListScreen.tsx`
- Navigation 配置：`frontend/src/navigation/AppNavigator.tsx`
