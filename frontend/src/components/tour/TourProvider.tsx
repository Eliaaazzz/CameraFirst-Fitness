/**
 * Tour Provider - Custom implementation for app tour functionality
 * Uses full-screen modal cards instead of spotlight (works on Web + Native)
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
  ScrollView,
} from 'react-native';

// Tour step definition with title and icon
interface TourStep {
  zone: number;
  title: string;
  text: string;
  icon: string;
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
  registerStep: (zone: number, text: string, title?: string, icon?: string) => void;
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

// Step card component - shows in center of screen
const StepCard: React.FC<{
  step: TourStep;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  isFirst: boolean;
  isLast: boolean;
  currentIndex: number;
  totalSteps: number;
}> = ({
  step,
  onNext,
  onPrevious,
  onSkip,
  isFirst,
  isLast,
  currentIndex,
  totalSteps,
}) => {
  return (
    <Animated.View style={styles.cardContainer}>
      <View style={styles.card}>
        {/* Close button */}
        <Pressable style={styles.closeButton} onPress={onSkip}>
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>

        {/* Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{step.icon}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{step.title}</Text>

        {/* Description */}
        <Text style={styles.description}>{step.text}</Text>

        {/* Step indicators (dots) */}
        <View style={styles.indicators}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentIndex && styles.indicatorActive,
              ]}
            />
          ))}
        </View>

        {/* Navigation buttons */}
        <View style={styles.buttonRow}>
          {!isFirst && (
            <Pressable onPress={onPrevious} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </Pressable>
          )}
          <View style={{ flex: 1 }} />
          <Pressable onPress={onNext} style={styles.nextButton}>
            <Text style={styles.nextButtonText}>
              {isLast ? 'Get Started 🚀' : 'Next →'}
            </Text>
          </Pressable>
        </View>

        {/* Skip tour text */}
        {!isLast && (
          <Pressable onPress={onSkip} style={styles.skipText}>
            <Text style={styles.skipTextContent}>Skip Tour</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
};

// Main provider component
export const TourGuideProvider: React.FC<TourGuideProviderProps> = ({
  children,
  backdropColor = 'rgba(0, 0, 0, 0.85)',
}) => {
  const [steps, setSteps] = useState<Map<number, TourStep>>(new Map());
  const [isActive, setIsActive] = useState(false);
  const [currentZone, setCurrentZone] = useState<number | null>(null);
  const eventListenersRef = useRef<Map<string, Set<() => void>>>(new Map());

  // Get sorted step zones
  const sortedZones = useMemo(() => {
    return Array.from(steps.keys()).sort((a, b) => a - b);
  }, [steps]);

  const currentStep = currentZone !== null ? steps.get(currentZone) : null;
  const currentIndex = currentZone !== null ? sortedZones.indexOf(currentZone) : -1;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === sortedZones.length - 1;

  // Register a step
  const registerStep = useCallback(
    (zone: number, text: string, title: string = 'Tour Step', icon: string = '📍') => {
      setSteps((prev) => {
        const newSteps = new Map(prev);
        newSteps.set(zone, { zone, title, text, icon });
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

  // Start tour
  const start = useCallback(() => {
    if (sortedZones.length === 0) {
      console.warn('[TourProvider] No tour steps registered');
      return;
    }

    setCurrentZone(sortedZones[0]);
    setIsActive(true);
  }, [sortedZones]);

  // Stop tour
  const stop = useCallback(() => {
    setIsActive(false);
    setCurrentZone(null);
    emitEvent('stop');
  }, [emitEvent]);

  // Go to next step
  const next = useCallback(() => {
    if (isLast) {
      stop();
      return;
    }

    const nextIndex = currentIndex + 1;
    setCurrentZone(sortedZones[nextIndex]);
  }, [currentIndex, isLast, sortedZones, stop]);

  // Go to previous step
  const previous = useCallback(() => {
    if (isFirst) return;

    const prevIndex = currentIndex - 1;
    setCurrentZone(sortedZones[prevIndex]);
  }, [currentIndex, isFirst, sortedZones]);

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
        
        {/* Tour modal - full screen with backdrop */}
        <Modal
          visible={isActive && currentStep != null}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={stop}
        >
          <View style={[styles.backdrop, { backgroundColor: backdropColor }]}>
            {currentStep && (
              <StepCard
                step={currentStep}
                onNext={next}
                onPrevious={previous}
                onSkip={stop}
                isFirst={isFirst}
                isLast={isLast}
                currentIndex={currentIndex}
                totalSteps={sortedZones.length}
              />
            )}
          </View>
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
  title?: string;
  icon?: string;
  children: ReactNode;
  shape?: 'rectangle' | 'circle';
  borderRadius?: number;
}

// Zone component - simplified, no ref needed
export const TourGuideZone: React.FC<TourGuideZoneProps> = ({
  zone,
  text,
  title,
  icon,
  children,
}) => {
  const context = useContext(TourContext);

  useEffect(() => {
    if (context) {
      context.registerStep(zone, text, title, icon);
      return () => context.unregisterStep(zone);
    }
  }, [context, zone, text, title, icon]);

  return <>{children}</>;
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 400,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '600',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  indicatorActive: {
    backgroundColor: '#A78BFA',
    width: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  nextButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#A78BFA',
    minWidth: 120,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipText: {
    marginTop: 16,
    alignItems: 'center',
  },
  skipTextContent: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'underline',
  },
});

export default TourGuideProvider;
