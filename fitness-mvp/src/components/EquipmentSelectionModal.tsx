import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Button, Text } from '@/components';
import { radii, spacing } from '@/utils';

export type EquipmentChoice = 'bodyweight' | 'dumbbells' | 'mat';

type Props = {
  visible: boolean;
  lastChoice?: EquipmentChoice | null;
  onSelect: (choice: EquipmentChoice) => void;
  onSkip: () => void;
  onRequestClose?: () => void;
};

export const EquipmentSelectionModal = ({ visible, lastChoice, onSelect, onSkip, onRequestClose }: Props) => {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onRequestClose}>
      <Pressable style={styles.overlay} onPress={onRequestClose}>
        <View style={styles.card}>
          <Text variant="heading2" weight="bold" style={{ textAlign: 'center' }}>
            What equipment do you see?
          </Text>
          {lastChoice ? (
            <Text variant="caption" style={{ textAlign: 'center', opacity: 0.8 }}>
              Last time you chose: {lastChoice.charAt(0).toUpperCase() + lastChoice.slice(1)}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable style={styles.option} onPress={() => onSelect('bodyweight')} accessibilityRole="button">
              <Feather name="user" size={24} />
              <Text weight="medium">Bodyweight</Text>
            </Pressable>

            <Pressable style={styles.option} onPress={() => onSelect('dumbbells')} accessibilityRole="button">
              <Feather name="package" size={24} />
              <Text weight="medium">Dumbbells</Text>
            </Pressable>

            <Pressable style={styles.option} onPress={() => onSelect('mat')} accessibilityRole="button">
              <Feather name="grid" size={24} />
              <Text weight="medium">Mat</Text>
            </Pressable>
          </View>

          <Button title="Skip" variant="ghost" onPress={onSkip} />
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    borderRadius: radii.xl,
    backgroundColor: '#fff',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  actions: {
    gap: spacing.md,
  },
  option: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(0,0,0,0.04)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});

