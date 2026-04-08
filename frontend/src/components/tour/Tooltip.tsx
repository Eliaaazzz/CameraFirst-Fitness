import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TourStep, ZoneLayout } from './types';

interface TooltipProps {
  step: TourStep;
  layout: ZoneLayout;
  onNext: () => void;
  onPrev: () => void;
  onStop: () => void;
  isFirst: boolean;
  isLast: boolean;
  windowWidth: number;
  windowHeight: number;
  currentStepIndex: number;
  totalSteps: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  step,
  layout,
  onNext,
  onPrev,
  onStop,
  isFirst,
  isLast,
  windowWidth,
  windowHeight,
  currentStepIndex,
  totalSteps
}) => {
  // Simple positioning logic: prefer bottom, flip to top if not enough space
  const tooltipHeight = 180; // estimated
  const spaceBelow = windowHeight - (layout.y + layout.height);
  const showBelow = spaceBelow > tooltipHeight || layout.y < tooltipHeight;

  const top = showBelow
    ? layout.y + layout.height + 10
    : layout.y - tooltipHeight - 10;

  // Center horizontally relative to target, but keep within screen bounds
  let left = layout.x + (layout.width / 2) - 150; // assuming 300 width
  left = Math.max(20, Math.min(left, windowWidth - 320));

  // Determine arrow position
  const arrowTop = showBelow ? -8 : undefined;
  const arrowBottom = !showBelow ? -8 : undefined;
  // Arrow horizontal center relative to the tooltip
  const arrowLeft = Math.max(10, Math.min(layout.x + (layout.width / 2) - left - 10, 280));

  return (
    <View style={[styles.tooltipContainer, { top, left }]}>
      {/* Arrow */}
      <View
        style={[
          styles.tooltipArrow,
          {
            top: arrowTop,
            bottom: arrowBottom,
            left: arrowLeft,
            transform: [{ rotate: '45deg' }]
          }
        ]}
      />

      <View style={styles.tooltipContent}>
        <View style={styles.tooltipHeader}>
          <Text style={styles.stepCounter}>{currentStepIndex + 1} of {totalSteps}</Text>

          {/* Close Button at top right */}
          <Pressable hitSlop={15} onPress={onStop} style={styles.closeBtnContainer}>
            <Text style={styles.closeBtn}>✕</Text>
          </Pressable>
        </View>

        {/* Title Centered */}
        <Text style={styles.tooltipTitle}>{step.title}</Text>

        {/* Content */}
        <Text style={styles.tooltipText}>{step.text}</Text>

        {/* Footer with navigation - react-joyride style */}
        <View style={styles.tooltipFooter}>
          {/* Skip - always visible on the left */}
          <Pressable onPress={onStop} hitSlop={10}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>

          {/* Right side: Back + Next */}
          <View style={styles.rightButtons}>
            {/* Back - only visible after first step */}
            {!isFirst && (
              <Pressable onPress={onPrev} hitSlop={10} style={styles.backBtn}>
                <Text style={styles.backText}>Back</Text>
              </Pressable>
            )}

            {/* Next button with step counter */}
            <Pressable onPress={onNext} style={styles.nextBtn}>
              <Text style={styles.nextBtnText}>
                {isLast ? 'Finish' : 'Next'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  tooltipContainer: {
    position: 'absolute',
    width: 300,
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 1000,
  },
  tooltipContent: {
    alignItems: 'center',
  },
  tooltipHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    minHeight: 24,
  },
  stepCounter: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  closeBtnContainer: {
    marginRight: -4,
    padding: 4,
  },
  closeBtn: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  tooltipTitle: {
    fontSize: 20,
    fontWeight: '800', // Extra bold
    color: '#333333',
    marginBottom: 10,
    textAlign: 'left',
    width: '100%',
  },
  tooltipText: {
    fontSize: 15,
    color: '#555555',
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'left',
    width: '100%',
  },
  tooltipFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff0044',
  },
  nextBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ff0044',
    backgroundColor: '#ff0044',
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  tooltipArrow: {
    position: 'absolute',
    width: 20,
    height: 20,
    backgroundColor: 'white',
    zIndex: -1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  }
});
