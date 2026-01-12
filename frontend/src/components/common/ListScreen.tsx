/**
 * ListScreen - 可复用的列表页面模板
 *
 * 使用场景：需要 FlatList + 搜索 + 推荐 + 已保存列表 的页面
 *
 * 关键设计原则：
 * 1. styles 和 ItemSeparator 必须定义在组件外部（避免重复创建）
 * 2. 不要在 Tab 内嵌套 Stack Navigator（会破坏 Web 端 flex 布局）
 * 3. Detail 页面用隐藏的 Tab.Screen 实现
 * 4. 使用 SafeAreaWrapper > Container > FlatList 结构
 *
 * Navigation 配置示例：
 * ```tsx
 * // AppNavigator.tsx
 * const TAB_CONFIG = [
 *   { name: 'Items', component: SafeItemsScreen, ... },
 * ];
 *
 * // Detail 页面放在隐藏的 Tab.Screen
 * <Tab.Screen
 *   name="ItemDetail"
 *   component={SafeItemDetailScreen}
 *   options={{
 *     tabBarButton: () => null,
 *     tabBarItemStyle: { display: 'none' },
 *     tabBarStyle: { display: 'none' },
 *   }}
 * />
 * ```
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { FAB } from 'react-native-paper';

import { Container, EmptyStateCard, ListSkeleton, SafeAreaWrapper, SearchBar, SearchSuggestions, Text, type SuggestionItem } from '@/components';
import { TourGuideZone } from '@/components/tour/TourProvider';
import { getTheme, spacing, useContentBottomPadding, useFABBottomPosition } from '@/utils';

// ============================================
// Types
// ============================================

export interface ListScreenProps<TItem, TSearchResult, TRecommended> {
  // 页面标题
  title: string;
  subtitle: string;

  // 数据
  items: TItem[];
  savedItemIds: Set<string>;
  recommendedItems: TRecommended[];
  searchResults: TSearchResult[];

  // 状态
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  isSearching: boolean;

  // 搜索
  searchQuery: string;
  searchPlaceholder: string;
  searchSuggestions: SuggestionItem[];
  onSearch: (query: string) => void;
  onClearSearch: () => void;

  // 刷新
  onRefresh: () => void;
  onRetry: () => void;

  // Tour
  tourZone?: number;
  tourText?: string;

  // 渲染函数
  renderItem: (item: TItem) => React.ReactElement;
  renderSearchResultItem: (item: TSearchResult, isSaved: boolean) => React.ReactElement;
  renderRecommendedItem: (item: TRecommended, isSaved: boolean) => React.ReactElement;
  renderEmptyIcon: () => React.ReactElement;
  renderErrorIcon: () => React.ReactElement;

  // 获取 item id
  getItemId: (item: TItem) => string;
  getSearchResultId: (item: TSearchResult) => string;
  getRecommendedId: (item: TRecommended) => string;

  // 空状态文案
  emptyTitle: string;
  savedSectionTitle: string;
}

// ============================================
// Styles (定义在组件外部 - 关键！)
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  subtitle: {
    opacity: 0.7,
  },
  searchContainer: {
    marginTop: spacing.md,
  },
  suggestionsSection: {
    marginTop: spacing.sm,
  },
  section: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  recommendedList: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  recommendedCard: {
    width: 260,
  },
  recommendedNote: {
    opacity: 0.7,
  },
  searchResults: {
    gap: spacing.md,
  },
  searchResultCard: {
    marginBottom: spacing.sm,
  },
  noResultsText: {
    opacity: 0.6,
  },
  savedHeader: {
    marginTop: spacing.lg,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
  },
});

// ItemSeparator 定义在组件外部 - 关键！
const ItemSeparator = () => <View style={{ height: spacing.md }} />;

// ============================================
// Component
// ============================================

export function ListScreen<TItem, TSearchResult, TRecommended>({
  title,
  subtitle,
  items,
  savedItemIds,
  recommendedItems,
  searchResults,
  isLoading,
  isError,
  isRefreshing,
  isSearching,
  searchQuery,
  searchPlaceholder,
  searchSuggestions,
  onSearch,
  onClearSearch,
  onRefresh,
  onRetry,
  tourZone,
  tourText,
  renderItem,
  renderSearchResultItem,
  renderRecommendedItem,
  renderEmptyIcon,
  renderErrorIcon,
  getItemId,
  getSearchResultId,
  getRecommendedId,
  emptyTitle,
  savedSectionTitle,
}: ListScreenProps<TItem, TSearchResult, TRecommended>) {
  const theme = getTheme('light');
  const listRef = useRef<FlatList<TItem>>(null);
  const [showFab, setShowFab] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const listBottomPadding = useContentBottomPadding(spacing.lg);
  const fabBottomPosition = useFABBottomPosition(spacing.md);

  const isSearchMode = searchQuery.trim().length > 0;
  const showSearchUI = isSearchFocused || isSearchMode;

  // Memoize empty component
  const listEmptyComponent = useMemo(
    () => (
      <EmptyStateCard
        icon={renderEmptyIcon()}
        title={emptyTitle}
        variant="single"
      />
    ),
    [renderEmptyIcon, emptyTitle]
  );

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const shouldShow = offsetY > 240;
    setShowFab((currentValue) => {
      if (currentValue !== shouldShow) {
        return shouldShow;
      }
      return currentValue;
    });
  }, []);

  const handleSuggestionSelect = useCallback(
    (suggestion: SuggestionItem) => {
      onSearch(suggestion.label);
    },
    [onSearch]
  );

  const flatListRenderItem = useCallback(
    ({ item }: { item: TItem }) => renderItem(item),
    [renderItem]
  );

  const keyExtractor = useCallback(
    (item: TItem) => getItemId(item),
    [getItemId]
  );

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaWrapper>
        <Container>
          <View style={styles.header}>
            <Text variant="heading1" weight="bold" style={{ color: theme.colors.textPrimary }}>
              {title}
            </Text>
            <Text variant="body" style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {subtitle}
            </Text>
          </View>
          <ListSkeleton rows={4} showAvatar primaryWidth="55%" secondaryWidth="32%" />
        </Container>
      </SafeAreaWrapper>
    );
  }

  // Error state
  if (isError) {
    return (
      <SafeAreaWrapper>
        <Container>
          <EmptyStateCard
            icon={renderErrorIcon()}
            title={`Unable to load ${title.toLowerCase()}`}
            subtitle="Check your network connection and try again."
            ctaLabel="Retry"
            onCtaPress={onRetry}
          />
        </Container>
      </SafeAreaWrapper>
    );
  }

  // Search bar component (with optional tour zone)
  const searchBarContent = (
    <View style={styles.searchContainer}>
      <SearchBar
        placeholder={searchPlaceholder}
        value={searchQuery}
        onChangeText={onSearch}
        onClear={onClearSearch}
        onFocusChange={setIsSearchFocused}
        isLoading={isSearching}
      />
    </View>
  );

  const listHeaderComponent = (
    <View style={styles.header}>
      <Text variant="heading1" weight="bold" style={{ color: theme.colors.textPrimary }}>
        {title}
      </Text>
      <Text variant="body" style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        {subtitle}
      </Text>

      {/* Search Bar */}
      {tourZone !== undefined && tourText ? (
        <TourGuideZone zone={tourZone} text={tourText} shape="rectangle" borderRadius={12}>
          {searchBarContent}
        </TourGuideZone>
      ) : (
        searchBarContent
      )}

      {/* Search Suggestions */}
      {showSearchUI && (
        <View style={styles.suggestionsSection}>
          <SearchSuggestions
            suggestions={searchSuggestions}
            onSelect={handleSuggestionSelect}
            title="Popular searches"
          />
        </View>
      )}

      {/* Search Results */}
      {isSearchMode && (
        <View style={styles.section}>
          <Text variant="heading2" weight="semibold" style={{ color: theme.colors.textPrimary }}>
            Search Results
          </Text>
          {isSearching ? (
            <Text variant="caption" style={[styles.recommendedNote, { color: theme.colors.textSecondary }]}>
              Searching...
            </Text>
          ) : searchResults.length === 0 ? (
            <Text variant="caption" style={[styles.noResultsText, { color: theme.colors.textSecondary }]}>
              No results found for "{searchQuery}"
            </Text>
          ) : (
            <View style={styles.searchResults}>
              {searchResults.map((item) => (
                <View key={getSearchResultId(item)} style={styles.searchResultCard}>
                  {renderSearchResultItem(item, savedItemIds.has(getSearchResultId(item)))}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Recommended Section */}
      {!showSearchUI && recommendedItems.length > 0 && (
        <View style={styles.section}>
          <Text variant="heading2" weight="semibold" style={{ color: theme.colors.textPrimary }}>
            Recommended for you
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recommendedList}
          >
            {recommendedItems.map((item) => (
              <View key={getRecommendedId(item)} style={styles.recommendedCard}>
                {renderRecommendedItem(item, savedItemIds.has(getRecommendedId(item)))}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Saved Items Header */}
      {!showSearchUI && (
        <Text variant="heading2" weight="semibold" style={[styles.savedHeader, { color: theme.colors.textPrimary }]}>
          {savedSectionTitle}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaWrapper>
      <Container style={styles.container}>
        <FlatList
          ref={listRef}
          data={showSearchUI ? [] : items}
          keyExtractor={keyExtractor}
          renderItem={flatListRenderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
          ItemSeparatorComponent={ItemSeparator}
          ListHeaderComponent={listHeaderComponent}
          ListEmptyComponent={showSearchUI ? null : listEmptyComponent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />
      </Container>
      <FAB
        icon="arrow-up"
        style={[styles.fab, { bottom: fabBottomPosition, backgroundColor: theme.colors.primary }]}
        color="#FFF"
        mode="elevated"
        onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
        visible={showFab}
      />
    </SafeAreaWrapper>
  );
}

export default ListScreen;
