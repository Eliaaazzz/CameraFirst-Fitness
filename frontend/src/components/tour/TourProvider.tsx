/**
 * Tour Provider - Custom implementation for app tour functionality
 * A simple, cross-platform tour guide implementation for React Native
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  Text,
  type LayoutRectangle,
  type ViewStyle,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Tour step data stored in context
interface TourStepData {
  zone: number;
  text: string;
  ref: React.RefObject<View>;
  layout: LayoutRectangle | null;
}

// Event emitter interface for compatibility
interface TourEventEmitter {
  on: (event: string, callback: () => void) => void;
  off: (event: string, callback: () => void) => void;
}

// Tour controller interface
interface TourController {
  canStart: boolean;
  start: () => void;
  stop: () => void;
  eventEmitter: TourEventEmitter;
}

// Context for tour management
interface TourContextValue {
  registerStep: (zone: number, text: string, ref: React.RefObject<View>) => void;
  unregisterStep: (zone: number) => void;
  isActive: boolean;
  currentZone: number | null;
}

const TourContext = createContext<TourContextValue | null>(null);

// Separate context for controller to avoid re-renders
interface TourControllerContextValue {
  controller: TourController;
}

const TourControllerContext = createContext<TourControllerContextValue | null>(null);

// Provider props
interface TourGuideProviderProps {
  children: ReactNode;
  backdropColor?: string;
}

// Tooltip component
const Tooltip: React.FC<{
  text: string;
  targetLayout: LayoutRectangle;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  isFirst: boolean;
  isLast: boolean;
  currentStep: number;
  totalSteps: number;
}> = ({
  text,
  targetLayout,
  onNext,
  onPrevious,
  onSkip,
  isFirst,
  isLast,
  currentStep,
  totalSteps,
}) => {
  const tooltipWidth = Math.min(300, SCREEN_WIDTH - 40);
  
  // Calculate tooltip position - prefer below target, but flip if needed
  const spaceBelow = SCREEN_HEIGHT - (targetLayout.y + targetLayout.height);
  const spaceAbove = targetLayout.y;
  const showBelow = spaceBelow > 200 || spaceBelow > spaceAbove;
  
  const tooltipTop = showBelow
    ? targetLayout.y + targetLayout.height + 16
    : targetLayout.y - 180;
  
  // Center horizontally relative to target, but keep within screen bounds
  let tooltipLeft = targetLayout.x + targetLayout.width / 2 - tooltipWidth / 2;
  tooltipLeft = Math.max(20, Math.min(tooltipLeft, SCREEN_WIDTH - tooltipWidth - 20));

  return (
    <Animated.View
      style={[
        styles.tooltip,
        {
          top: tooltipTop,
          left: tooltipLeft,
          width: tooltipWidth,
        },
      ]}
    >
      <Text style={styles.tooltipText}>{text}</Text>
      <Text style={styles.stepIndicator}>
        Step {currentStep} of {totalSteps}
      </Text>
      <View style={styles.tooltipButtons}>
        {!isFirst && (
          <Pressable onPress={onPrevious} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
        )}
        <Pressable onPress={onSkip} style={styles.skipButton}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </Pressable>
        <Pressable onPress={onNext} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{isLast ? 'Done' : 'Next'}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

// Spotlight overlay with hole for target
const SpotlightOverlay: React.FC<{
  targetLayout: LayoutRectangle;
  backdropColor: string;
}> = ({ targetLayout, backdropColor }) => {
  const padding = 8;
  const borderRadius = 12;
  
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Top overlay */}
      <View
        style={[
          styles.overlayPart,
          {
            backgroundColor: backdropColor,
            top: 0,
            left: 0,
            right: 0,
            height: Math.max(0, targetLayout.y - padding),
          },
        ]}
      />
      {/* Left overlay */}
      <View
        style={[
          styles.overlayPart,
          {
            backgroundColor: backdropColor,
            top: targetLayout.y - padding,
            left: 0,
            width: Math.max(0, targetLayout.x - padding),
            height: targetLayout.height + padding * 2,
          },
        ]}
      />
      {/* Right overlay */}
      <View
        style={[
          styles.overlayPart,
          {
            backgroundColor: backdropColor,
            top: targetLayout.y - padding,
            left: targetLayout.x + targetLayout.width + padding,
            right: 0,
            height: targetLayout.height + padding * 2,
          },
        ]}
      />
      {/* Bottom overlay */}
      <View
        style={[
          styles.overlayPart,
          {
            backgroundColor: backdropColor,
            top: targetLayout.y + targetLayout.height + padding,
            left: 0,
            right: 0,
            bottom: 0,
          },
        ]}
      />
      {/* Spotlight border */}
      <View
        style={[
          styles.spotlightBorder,
          {
            top: targetLayout.y - padding,
            left: targetLayout.x - padding,
            width: targetLayout.width + padding * 2,
            height: targetLayout.height + padding * 2,
            borderRadius,
          },
        ]}
      />
    </View>
  );
};

// Main provider component
export const TourGuideProvider: React.FC<TourGuideProviderProps> = ({
  children,
  backdropColor = 'rgba(0, 0, 0, 0.75)',
}) => {
  const [steps, setSteps] = useState<Map<number, TourStepData>>(new Map());
  const [isActive, setIsActive] = useState(false);
  const [currentZone, setCurrentZone] = useState<number | null>(null);
  const eventListenersRef = useRef<Map<string, Set<() => void>>>(new Map());

  // Get sorted step zones
  const sortedZones = useMemo(() => {
    return Array.from(steps.keys()).sort((a, b) => a - b);
  }, [steps]);

  const currentStepData = currentZone !== null ? steps.get(currentZone) : null;
  const currentIndex = currentZone !== null ? sortedZones.indexOf(currentZone) : -1;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === sortedZones.length - 1;

  // Register a step
  const registerStep = useCallback(
    (zone: number, text: string, ref: React.RefObject<View>) => {
      setSteps((prev) => {
        const newSteps = new Map(prev);
        newSteps.set(zone, { zone, text, ref, layout: null });
        return newSteps;
      });
    },
    []
  );

  // Unregister a step
  const unregisterStep = useCallback((zone: number) => {
    setSteps((prev) => {
      const newSteps = new Map(prev);
      newSteps.delete(zone);
      return newSteps;
    });
  }, []);

  // Emit event to listeners
  const emitEvent = useCallback((event: string) => {
    eventListenersRef.current.get(event)?.forEach((callback) => callback());
  }, []);

  // Event emitter
  const eventEmitter: TourEventEmitter = useMemo(
    () => ({
      on: (event: string, callback: () => void) => {
        if (!eventListenersRef.current.has(event)) {
          eventListenersRef.current.set(event, new Set());
        }
        eventListenersRef.current.get(event)!.add(callback);
      },
      off: (event: string, callback: () => void) => {
        eventListenersRef.current.get(event)?.delete(callback);
      },
    }),
    []
  );

  // Measure target layout
  const measureStep = useCallback(async (stepData: TourStepData): Promise<LayoutRectangle | null> => {
    return new Promise((resolve) => {
      if (!stepData.ref.current) {
        resolve(null);
        return;
      }
      stepData.ref.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          resolve({ x, y, width, height });
        } else {
          resolve(null);
        }
      });
    });
  }, []);

  // Start tour
  const start = useCallback(async () => {
    if (sortedZones.length === 0) {
      console.warn('[TourProvider] No tour steps registered');
      return;
    }

    const firstZone = sortedZones[0];
    const firstStep = steps.get(firstZone);
    if (!firstStep) return;

    // Measure the first step
    const layout = await measureStep(firstStep);
    if (layout) {
      setSteps((prev) => {
        const newSteps = new Map(prev);
        const step = newSteps.get(firstZone);
        if (step) {
          newSteps.set(firstZone, { ...step, layout });
        }
        return newSteps;
      });
      setCurrentZone(firstZone);
      setIsActive(true);
    } else {
      console.warn('[TourProvider] Could not measure first step');
    }
  }, [sortedZones, steps, measureStep]);

  // Stop tour
  const stop = useCallback(() => {
    setIsActive(false);
    setCurrentZone(null);
    emitEvent('stop');
  }, [emitEvent]);

  // Go to next step
  const next = useCallback(async () => {
    if (isLast) {
      stop();
      return;
    }

    const nextIndex = currentIndex + 1;
    const nextZone = sortedZones[nextIndex];
    const nextStep = steps.get(nextZone);
    if (!nextStep) return;

    const layout = await measureStep(nextStep);
    if (layout) {
      setSteps((prev) => {
        const newSteps = new Map(prev);
        const step = newSteps.get(nextZone);
        if (step) {
          newSteps.set(nextZone, { ...step, layout });
        }
        return newSteps;
      });
      setCurrentZone(nextZone);
    }
  }, [currentIndex, isLast, sortedZones, steps, measureStep, stop]);

  // Go to previous step
  const previous = useCallback(async () => {
    if (isFirst) return;

    const prevIndex = currentIndex - 1;
    const prevZone = sortedZones[prevIndex];
    const prevStep = steps.get(prevZone);
    if (!prevStep) return;

    const layout = await measureStep(prevStep);
    if (layout) {
      setSteps((prev) => {
        const newSteps = new Map(prev);
        const step = newSteps.get(prevZone);
        if (step) {
          newSteps.set(prevZone, { ...step, layout });
        }
        return newSteps;
      });
      setCurrentZone(prevZone);
    }
  }, [currentIndex, isFirst, sortedZones, steps, measureStep]);

  // Controller
  const controller: TourController = useMemo(
    () => ({
      canStart: steps.size > 0,
      start,
      stop,
      eventEmitter,
    }),
    [steps.size, start, stop, eventEmitter]
  );

  const tourContextValue = useMemo(
    () => ({
      registerStep,
      unregisterStep,
      isActive,
      currentZone,
    }),
    [registerStep, unregisterStep, isActive, currentZone]
  );

  const controllerContextValue = useMemo(
    () => ({ controller }),
    [controller]
  );

  return (
    <TourControllerContext.Provider value={controllerContextValue}>
      <TourContext.Provider value={tourContextValue}>
        {children}
        
        {/* Tour overlay modal */}
        <Modal
          visible={isActive && currentStepData?.layout != null}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={stop}
        >
          {currentStepData?.layout && (
            <>
              <SpotlightOverlay
                targetLayout={currentStepData.layout}
                backdropColor={backdropColor}
              />
              <Tooltip
                text={currentStepData.text}
                targetLayout={currentStepData.layout}
                onNext={next}
                onPrevious={previous}
                onSkip={stop}
                isFirst={isFirst}
                isLast={isLast}
                currentStep={currentIndex + 1}
                totalSteps={sortedZones.length}
              />
            </>
          )}
        </Modal>
      </TourContext.Provider>
    </TourControllerContext.Provider>
  );
};

// Hook to get tour controller
export const useTourGuideController = (): TourController => {
  const context = useContext(TourControllerContext);

  if (!context) {
    // Return a no-op controller if not in a tour context
    return {
      canStart: false,
      start: () => {},
      stop: () => {},
      eventEmitter: {
        on: () => {},
        off: () => {},
      },
    };
  }

  return context.controller;
};

// Zone component props
interface TourGuideZoneProps {
  zone: number;
  text: string;
  children: ReactNode;
  shape?: 'rectangle' | 'circle';
  borderRadius?: number;
  style?: ViewStyle;
}

// Zone component
export const TourGuideZone: React.FC<TourGuideZoneProps> = ({
  zone,
  text,
  children,
  style,
}) => {
  const context = useContext(TourContext);
  const ref = useRef<View>(null);

  useEffect(() => {
    if (context && ref.current) {
      context.registerStep(zone, text, ref as React.RefObject<View>);
      return () => context.unregisterStep(zone);
    }
  }, [context, zone, text]);

  return (
    <View ref={ref} style={style} collapsable={false}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  overlayPart: {
    position: 'absolute',
  },
  spotlightBorder: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  tooltipText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1F2937',
    marginBottom: 8,
  },
  stepIndicator: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  tooltipButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  primaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#A78BFA',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
});

export default TourGuideProvider;
