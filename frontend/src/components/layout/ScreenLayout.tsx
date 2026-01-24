import React from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import {
  LAYOUT_DIMENSIONS,
  useLayoutMode,
  useRightPanelVisible,
  useSidebarVisible,
} from '@/utils/responsive';
import { colors, spacing } from '@/utils/theme';

interface ScreenLayoutProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: object;
}

/**
 * ScreenLayout - Three-column layout wrapper for desktop web
 *
 * Layout modes:
 * - mobile (<1024px): Just renders children (no sidebar, no right panel)
 * - sidebar (1024-1263px): Sidebar + main content
 * - three-column (>=1264px): Sidebar + main content + right panel
 *
 * Note: Sidebar is rendered by AppNavigator, not here.
 * This component only handles the main content area and right panel.
 */
export function ScreenLayout({
  children,
  rightPanel,
  scrollable = true,
  contentContainerStyle,
}: ScreenLayoutProps) {
  const layoutMode = useLayoutMode();
  const showSidebar = useSidebarVisible();
  const showRightPanel = useRightPanelVisible();

  // Mobile layout - just render children as-is
  if (layoutMode === 'mobile') {
    return <>{children}</>;
  }

  const mainContent = scrollable ? (
    <ScrollView
      style={styles.mainScrollView}
      contentContainerStyle={[styles.mainContentContainer, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.mainContent, contentContainerStyle]}>{children}</View>
  );

  return (
    <View style={styles.container}>
      {/* Main Content Area */}
      <View
        style={[
          styles.mainWrapper,
          showRightPanel && styles.mainWrapperWithRightPanel,
        ]}
      >
        {mainContent}
      </View>

      {/* Right Panel (only on wide screens) */}
      {showRightPanel && rightPanel && (
        <View style={styles.rightPanel}>
          <View style={styles.rightPanelContent}>
            {rightPanel}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.light.background,
  },
  mainWrapper: {
    flex: 1,
    maxWidth: '100%',
  },
  mainWrapperWithRightPanel: {
    // When right panel is visible, constrain main content
    maxWidth: `calc(100% - ${LAYOUT_DIMENSIONS.rightPanelWidth}px)` as any,
  },
  mainScrollView: {
    flex: 1,
    backgroundColor: colors.light.surface,
  },
  mainContentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
    backgroundColor: colors.light.surface,
    // Center content with max width on very wide screens
    ...(Platform.OS === 'web' && {
      maxWidth: LAYOUT_DIMENSIONS.mainContentMaxWidth + spacing.lg * 2,
      marginHorizontal: 'auto',
      width: '100%',
    }),
  },
  mainContent: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.light.surface,
    ...(Platform.OS === 'web' && {
      display: 'flex' as any,
      flexDirection: 'column' as any,
      height: '100%',
    }),
  },
  rightPanel: {
    width: LAYOUT_DIMENSIONS.rightPanelWidth,
    borderLeftWidth: 1,
    borderLeftColor: colors.light.border,
    backgroundColor: colors.light.surface,
  },
  rightPanelContent: {
    flex: 1,
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
});

export default ScreenLayout;
