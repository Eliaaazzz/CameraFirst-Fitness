import type { MealEntry } from '@/types/mealPlan';
import { COLORS, SHAPE, spacing } from '@/utils';
import React from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Chip, IconButton, Text as PaperText } from 'react-native-paper';

interface MealDetailModalProps {
  visible: boolean;
  meal: MealEntry | null;
  onDismiss: () => void;
  plan?: any;
  dayNumber?: number;
  userId?: string;
  onLogged?: () => void;
}

const MealDetailModal: React.FC<MealDetailModalProps> = ({ visible, meal, onDismiss }) => {
  if (!meal) return null;

  const mealName = meal.recipeName || meal.mealType || 'Meal Details';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <PaperText variant="headlineSmall" style={styles.title}>
              {mealName}
            </PaperText>
            <IconButton icon="close" onPress={onDismiss} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {meal.mealType && (
              <Chip style={styles.typeChip}>{meal.mealType}</Chip>
            )}

            <View style={styles.nutritionRow}>
              <View style={styles.nutritionItem}>
                <PaperText variant="titleMedium" style={styles.nutritionValue}>
                  {meal.calories || 0}
                </PaperText>
                <PaperText variant="bodySmall" style={styles.nutritionLabel}>
                  Calories
                </PaperText>
              </View>
              <View style={styles.nutritionItem}>
                <PaperText variant="titleMedium" style={styles.nutritionValue}>
                  {meal.protein || 0}g
                </PaperText>
                <PaperText variant="bodySmall" style={styles.nutritionLabel}>
                  Protein
                </PaperText>
              </View>
              <View style={styles.nutritionItem}>
                <PaperText variant="titleMedium" style={styles.nutritionValue}>
                  {meal.carbs || 0}g
                </PaperText>
                <PaperText variant="bodySmall" style={styles.nutritionLabel}>
                  Carbs
                </PaperText>
              </View>
              <View style={styles.nutritionItem}>
                <PaperText variant="titleMedium" style={styles.nutritionValue}>
                  {meal.fat || 0}g
                </PaperText>
                <PaperText variant="bodySmall" style={styles.nutritionLabel}>
                  Fat
                </PaperText>
              </View>
            </View>

            {meal.note && (
              <View style={styles.section}>
                <PaperText variant="titleMedium" style={styles.sectionTitle}>
                  Notes
                </PaperText>
                <PaperText variant="bodyMedium" style={styles.instructions}>
                  {meal.note}
                </PaperText>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.background.light,
    borderTopLeftRadius: SHAPE.borderRadius.xl,
    borderTopRightRadius: SHAPE.borderRadius.xl,
    maxHeight: '80%',
    paddingBottom: spacing['2xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.divider,
  },
  title: {
    flex: 1,
    fontWeight: '600',
  },
  content: {
    padding: spacing.lg,
  },
  typeChip: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.primary.surfaceTint,
    borderRadius: SHAPE.borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontWeight: '600',
    color: COLORS.primary.main,
  },
  nutritionLabel: {
    color: COLORS.text.secondary,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  ingredientItem: {
    marginBottom: spacing.xs,
    color: COLORS.text.primary,
  },
  instructions: {
    color: COLORS.text.primary,
    lineHeight: 22,
  },
});

export default MealDetailModal;
