import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card, LoadingSpinner, SafeAreaWrapper, Text } from '@/components';
import { Badge, Button, Chip, EmptyState, FilterBar, GradientBackground, ScreenHeader, StatCard, Tag } from '@/components/ui';
import { COLORS, SHAPE, SPACING } from '@/utils/theme';

export const DesignSystemScreen = () => {
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [selectedChip, setSelectedChip] = useState<string>('filled');
  
  const filterOptions = [
    { id: 'fitness', label: 'Fitness' },
    { id: 'nutrition', label: 'Nutrition' },
    { id: 'wellness', label: 'Wellness' },
  ];

  return (
    <SafeAreaWrapper edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <ScreenHeader
          title="Design System"
          subtitle="Material 3 Purple Theme"
          variant="hero"
        />
        
        <View style={styles.content}>
          {/* Color Palette */}
          <View style={styles.section}>
            <Text variant="heading2" weight="bold" style={styles.sectionTitle}>
              Color Palette
            </Text>
            <View style={styles.colorRow}>
              <View style={[styles.colorSwatch, { backgroundColor: COLORS.primary.main }]}>
                <Text style={styles.colorLabel}>Primary</Text>
                <Text style={styles.colorHex}>#7C3AED</Text>
              </View>
              <View style={[styles.colorSwatch, { backgroundColor: COLORS.primary.dark }]}>
                <Text style={styles.colorLabel}>Dark</Text>
                <Text style={styles.colorHex}>#5B21B6</Text>
              </View>
              <View style={[styles.colorSwatch, { backgroundColor: COLORS.secondary.main }]}>
                <Text style={styles.colorLabel}>Secondary</Text>
                <Text style={styles.colorHex}>#A855F7</Text>
              </View>
            </View>
            <View style={styles.colorRow}>
              <View style={[styles.colorSwatch, { backgroundColor: COLORS.semantic.success }]}>
                <Text style={styles.colorLabel}>Success</Text>
              </View>
              <View style={[styles.colorSwatch, { backgroundColor: COLORS.semantic.warning }]}>
                <Text style={styles.colorLabel}>Warning</Text>
              </View>
              <View style={[styles.colorSwatch, { backgroundColor: COLORS.semantic.error }]}>
                <Text style={styles.colorLabel}>Error</Text>
              </View>
            </View>
          </View>

          {/* Chips & Badges */}
          <View style={styles.section}>
            <Text variant="heading2" weight="bold" style={styles.sectionTitle}>
              Chips & Badges
            </Text>
            <View style={styles.chipRow}>
              <Chip 
                label="Filled" 
                variant="filled" 
                selected={selectedChip === 'filled'}
                onPress={() => setSelectedChip('filled')}
              />
              <Chip 
                label="Tonal" 
                variant="tonal" 
                selected={selectedChip === 'tonal'}
                onPress={() => setSelectedChip('tonal')}
              />
              <Chip 
                label="Outlined" 
                variant="outlined" 
                selected={selectedChip === 'outlined'}
                onPress={() => setSelectedChip('outlined')}
              />
            </View>
            <View style={styles.chipRow}>
              <Chip 
                label="With Icon" 
                variant="tonal" 
                icon={<Feather name="star" size={12} color={COLORS.primary.main} />}
              />
              <Badge label="NEW" color="primary" />
              <Badge label="HOT" color="error" />
              <Tag label="Fitness" />
              <Tag label="Cardio" color="success" />
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.section}>
            <Text variant="heading2" weight="bold" style={styles.sectionTitle}>
              Buttons
            </Text>
            <View style={styles.buttonColumn}>
              <Button 
                title="Primary Button" 
                onPress={() => {}} 
                variant="primary" 
                icon={<Feather name="zap" size={16} color="#FFF" />}
              />
              <Button 
                title="Secondary Button" 
                onPress={() => {}} 
                variant="secondary" 
                icon={<Feather name="heart" size={16} color={COLORS.primary.main} />}
              />
              <Button title="Tonal Button" onPress={() => {}} variant="tonal" />
              <Button title="Outline Button" onPress={() => {}} variant="outline" />
              <Button title="Text Button" onPress={() => {}} variant="text" />
              <View style={styles.buttonRow}>
                <Button title="Loading" onPress={() => {}} loading />
                <Button title="Disabled" onPress={() => {}} disabled />
              </View>
            </View>
          </View>

          {/* Stat Cards */}
          <View style={styles.section}>
            <Text variant="heading2" weight="bold" style={styles.sectionTitle}>
              Stat Cards
            </Text>
            <View style={styles.statRow}>
              <StatCard
                label="Calories"
                value={1850}
                unit="kcal"
                icon={<Feather name="zap" size={20} color={COLORS.primary.main} />}
              />
              <StatCard
                label="Streak"
                value={7}
                unit="days"
                variant="highlighted"
              />
              <StatCard
                label="Progress"
                value={85}
                unit="%"
                trend={{ value: 12, direction: 'up' }}
              />
            </View>
          </View>

          {/* Filter Bar */}
          <View style={styles.section}>
            <Text variant="heading2" weight="bold" style={styles.sectionTitle}>
              Filter Bar
            </Text>
            <FilterBar
              options={filterOptions}
              selectedId={selectedFilter}
              onSelect={setSelectedFilter}
            />
          </View>

          {/* Cards */}
          <View style={styles.section}>
            <Text variant="heading2" weight="bold" style={styles.sectionTitle}>
              Cards
            </Text>
            <Card>
              <View style={styles.cardContent}>
                <MaterialCommunityIcons name="palette" size={24} color={COLORS.primary.main} />
                <Text variant="body" style={styles.cardText}>
                  Default card with 24px border radius and purple-tinted elevation shadow.
                </Text>
              </View>
            </Card>
            <GradientBackground variant="surface" intensity="medium" style={styles.gradientCard}>
              <View style={styles.cardContent}>
                <Feather name="layers" size={24} color={COLORS.primary.main} />
                <Text variant="body" style={styles.cardText}>
                  Gradient background component for subtle surface tints.
                </Text>
              </View>
            </GradientBackground>
          </View>

          {/* Empty State */}
          <View style={styles.section}>
            <Text variant="heading2" weight="bold" style={styles.sectionTitle}>
              Empty State
            </Text>
            <EmptyState
              icon={<Feather name="inbox" size={48} color={COLORS.primary.main} />}
              title="No items yet"
              description="Start adding items to see them appear here."
              actionLabel="Get Started"
              onAction={() => {}}
            />
          </View>

          {/* Loading States */}
          <View style={styles.section}>
            <Text variant="heading2" weight="bold" style={styles.sectionTitle}>
              Loading Spinners
            </Text>
            <View style={styles.loadingRow}>
              <LoadingSpinner size="small" />
              <LoadingSpinner size="medium" />
              <LoadingSpinner size="large" />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.dark.background,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl * 2,
  },
  content: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.xl,
  },
  section: {
    gap: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.text.primary,
  },
  colorRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  colorSwatch: {
    flex: 1,
    height: 70,
    borderRadius: SHAPE.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  colorHex: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  buttonColumn: {
    gap: SPACING.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  statRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  loadingRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cardText: {
    flex: 1,
    color: COLORS.text.secondary,
  },
  gradientCard: {
    padding: SPACING.md,
  },
});
