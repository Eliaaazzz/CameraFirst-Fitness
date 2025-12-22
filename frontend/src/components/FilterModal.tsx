/**
 * FilterModal - Material Design 3 Filter Modal
 *
 * Features:
 * - Multi-select filters (difficulty, duration, etc.)
 * - Material Motion animations
 * - Clear/Apply actions
 * - Accessible design
 */

import { Button, Card, Text } from '@/components';
import { radii, spacing } from '@/utils';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Button as PaperButton, Portal } from 'react-native-paper';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';

export type WorkoutFilters = {
  levels?: string[];
  durationRange?: { min: number; max: number };
  equipment?: string[];
};

export type RecipeFilters = {
  difficulties?: string[];
  timeRange?: { min: number; max: number };
};

type WorkoutFilterModalProps = {
  visible: boolean;
  filters: WorkoutFilters;
  onApply: (filters: WorkoutFilters) => void;
  onClose: () => void;
  type: 'workout';
};

type RecipeFilterModalProps = {
  visible: boolean;
  filters: RecipeFilters;
  onApply: (filters: RecipeFilters) => void;
  onClose: () => void;
  type: 'recipe';
};

type Props = WorkoutFilterModalProps | RecipeFilterModalProps;

export const FilterModal = ({ visible, filters, onApply, onClose, type }: Props) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleReset = () => {
    const emptyFilters = type === 'workout' ? {} : {};
    setLocalFilters(emptyFilters);
    onApply(emptyFilters);
    onClose();
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const toggleArrayItem = (key: string, value: string) => {
    setLocalFilters((prev) => {
      const array = (prev as any)[key] || [];
      const newArray = array.includes(value)
        ? array.filter((item: string) => item !== value)
        : [...array, value];
      return { ...prev, [key]: newArray.length > 0 ? newArray : undefined };
    });
  };

  if (!visible) return null;

  return (
    <Portal>
      <Modal
        visible={visible}
        animationType="none"
        transparent
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.overlay}
        >
          <Animated.View
            entering={SlideInDown.duration(300).springify()}
            exiting={SlideOutDown.duration(200)}
            style={styles.modalContainer}
          >
            <Card style={styles.modal}>
              <View style={styles.header}>
                <Text variant="heading2" weight="bold">
                  Filter {type === 'workout' ? 'Workouts' : 'Recipes'}
                </Text>
                <PaperButton mode="text" onPress={onClose} compact>
                  Close
                </PaperButton>
              </View>

              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {type === 'workout' ? (
                  <>
                    {/* Difficulty Level Filter */}
                    <View style={styles.section}>
                      <Text variant="body" weight="bold" style={styles.sectionTitle}>
                        Difficulty Level
                      </Text>
                      <View style={styles.chips}>
                        {['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((level) => (
                          <Chip
                            key={level}
                            selected={(localFilters as WorkoutFilters).levels?.includes(level)}
                            onPress={() => toggleArrayItem('levels', level)}
                            style={styles.chip}
                          >
                            {level}
                          </Chip>
                        ))}
                      </View>
                    </View>

                    {/* Duration Filter */}
                    <View style={styles.section}>
                      <Text variant="body" weight="bold" style={styles.sectionTitle}>
                        Duration
                      </Text>
                      <View style={styles.chips}>
                        <Chip
                          selected={
                            (localFilters as WorkoutFilters).durationRange?.max === 15
                          }
                          onPress={() =>
                            setLocalFilters((prev) => ({
                              ...prev,
                              durationRange: { min: 0, max: 15 },
                            }))
                          }
                          style={styles.chip}
                        >
                          {'< 15 min'}
                        </Chip>
                        <Chip
                          selected={
                            (localFilters as WorkoutFilters).durationRange?.min === 15 &&
                            (localFilters as WorkoutFilters).durationRange?.max === 30
                          }
                          onPress={() =>
                            setLocalFilters((prev) => ({
                              ...prev,
                              durationRange: { min: 15, max: 30 },
                            }))
                          }
                          style={styles.chip}
                        >
                          15-30 min
                        </Chip>
                        <Chip
                          selected={
                            (localFilters as WorkoutFilters).durationRange?.min === 30
                          }
                          onPress={() =>
                            setLocalFilters((prev) => ({
                              ...prev,
                              durationRange: { min: 30, max: 999 },
                            }))
                          }
                          style={styles.chip}
                        >
                          {'> 30 min'}
                        </Chip>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    {/* Recipe Difficulty Filter */}
                    <View style={styles.section}>
                      <Text variant="body" weight="bold" style={styles.sectionTitle}>
                        Difficulty
                      </Text>
                      <View style={styles.chips}>
                        {['EASY', 'MEDIUM', 'HARD'].map((difficulty) => (
                          <Chip
                            key={difficulty}
                            selected={(localFilters as RecipeFilters).difficulties?.includes(
                              difficulty
                            )}
                            onPress={() => toggleArrayItem('difficulties', difficulty)}
                            style={styles.chip}
                          >
                            {difficulty}
                          </Chip>
                        ))}
                      </View>
                    </View>

                    {/* Recipe Time Filter */}
                    <View style={styles.section}>
                      <Text variant="body" weight="bold" style={styles.sectionTitle}>
                        Prep Time
                      </Text>
                      <View style={styles.chips}>
                        <Chip
                          selected={(localFilters as RecipeFilters).timeRange?.max === 20}
                          onPress={() =>
                            setLocalFilters((prev) => ({
                              ...prev,
                              timeRange: { min: 0, max: 20 },
                            }))
                          }
                          style={styles.chip}
                        >
                          {'< 20 min'}
                        </Chip>
                        <Chip
                          selected={
                            (localFilters as RecipeFilters).timeRange?.min === 20 &&
                            (localFilters as RecipeFilters).timeRange?.max === 40
                          }
                          onPress={() =>
                            setLocalFilters((prev) => ({
                              ...prev,
                              timeRange: { min: 20, max: 40 },
                            }))
                          }
                          style={styles.chip}
                        >
                          20-40 min
                        </Chip>
                        <Chip
                          selected={(localFilters as RecipeFilters).timeRange?.min === 40}
                          onPress={() =>
                            setLocalFilters((prev) => ({
                              ...prev,
                              timeRange: { min: 40, max: 999 },
                            }))
                          }
                          style={styles.chip}
                        >
                          {'> 40 min'}
                        </Chip>
                      </View>
                    </View>
                  </>
                )}
              </ScrollView>

              <View style={styles.actions}>
                <Button title="Reset" variant="secondary" onPress={handleReset} />
                <Button title="Apply" onPress={handleApply} />
              </View>
            </Card>
          </Animated.View>
        </Animated.View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '80%',
  },
  modal: {
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  scrollView: {
    maxHeight: 400,
  },
  scrollContent: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    marginRight: 0,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
