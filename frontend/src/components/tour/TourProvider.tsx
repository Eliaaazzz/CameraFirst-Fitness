/**
 * Tour Provider - Compatibility layer for react-native-spotlight-tour
 * Provides a similar API to rn-tourguide for easier migration
 */

import React, { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import {
  SpotlightTourProvider,
  useSpotlightTour,
  TourStep,
} from 'react-native-spotlight-tour';

// Tour step configuration
export interface TourStepConfig {
  zone: number;
  text: string;
  shape?: 'rectangle' | 'circle';
  borderRadius?: number;
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
  eventEmitter: TourEventEmitter | null;
}

// Context for tour steps registration
interface TourContextValue {
  registerStep: (zone: number, ref: React.RefObject<View>) => void;
  unregisterStep: (zone: number) => void;
  controller: TourController;
}

const TourContext = createContext<TourContextValue | null>(null);

// Custom tooltip component
const CustomTooltip: React.FC<{
  current: number;
  next: () => void;
  previous: () => void;
  stop: () => void;
  isFirst: boolean;
  isLast: boolean;
}> = ({ current, next, previous, stop, isFirst, isLast }) => {
  return (
    <View style={tooltipStyles.container}>
      <View style={tooltipStyles.content}>
        <Text style={tooltipStyles.text}>
          {/* Text is provided by the step */}
        </Text>
      </View>
      <View style={tooltipStyles.buttons}>
        {!isFirst && (
          <Pressable onPress={previous} style={tooltipStyles.button}>
            <Text style={tooltipStyles.buttonText}>Back</Text>
          </Pressable>
        )}
        <Pressable onPress={stop} style={tooltipStyles.skipButton}>
          <Text style={tooltipStyles.skipText}>Skip</Text>
        </Pressable>
        <Pressable onPress={isLast ? stop : next} style={tooltipStyles.nextButton}>
          <Text style={tooltipStyles.nextText}>{isLast ? 'Done' : 'Next'}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const tooltipStyles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  content: {
    marginBottom: 12,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1F2937',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  nextButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#A78BFA',
  },
  nextText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

// Provider props
interface TourGuideProviderProps {
  children: ReactNode;
  backdropColor?: string;
  borderRadius?: number;
  maskOffset?: number;
  animationDuration?: number;
  labels?: {
    previous?: string;
    next?: string;
    skip?: string;
    finish?: string;
  };
  tooltipStyle?: ViewStyle;
}

// Inner provider that has access to useSpotlightTour
const TourGuideProviderInner: React.FC<{ children: ReactNode }> = ({ children }) => {
  const tour = useSpotlightTour();
  const stepsRef = useRef<Map<number, React.RefObject<View>>>(new Map());
  const eventListenersRef = useRef<Map<string, Set<() => void>>>(new Map());
  const [isReady, setIsReady] = useState(false);

  const registerStep = useCallback((zone: number, ref: React.RefObject<View>) => {
    stepsRef.current.set(zone, ref);
    setIsReady(stepsRef.current.size > 0);
  }, []);

  const unregisterStep = useCallback((zone: number) => {
    stepsRef.current.delete(zone);
    setIsReady(stepsRef.current.size > 0);
  }, []);

  const eventEmitter: TourEventEmitter = useMemo(() => ({
    on: (event: string, callback: () => void) => {
      if (!eventListenersRef.current.has(event)) {
        eventListenersRef.current.set(event, new Set());
      }
      eventListenersRef.current.get(event)!.add(callback);
    },
    off: (event: string, callback: () => void) => {
      eventListenersRef.current.get(event)?.delete(callback);
    },
  }), []);

  const emitEvent = useCallback((event: string) => {
    eventListenersRef.current.get(event)?.forEach((callback) => callback());
  }, []);

  const controller: TourController = useMemo(() => ({
    canStart: isReady,
    start: () => {
      tour.start();
    },
    stop: () => {
      tour.stop();
      emitEvent('stop');
    },
    eventEmitter,
  }), [isReady, tour, eventEmitter, emitEvent]);

  const contextValue = useMemo(() => ({
    registerStep,
    unregisterStep,
    controller,
  }), [registerStep, unregisterStep, controller]);

  return (
    <TourContext.Provider value={contextValue}>
      {children}
    </TourContext.Provider>
  );
};

// Main provider component
export const TourGuideProvider: React.FC<TourGuideProviderProps> = ({
  children,
  backdropColor = 'rgba(0, 0, 0, 0.75)',
}) => {
  // Define tour steps - these will be dynamically populated
  const steps: TourStep[] = useMemo(() => [
    // Steps are defined in individual screens using TourGuideZone
  ], []);

  return (
    <SpotlightTourProvider
      steps={steps}
      overlayColor={backdropColor}
      overlayOpacity={0.75}
      nativeDriver={true}
      motion="fade"
      shape="rectangle"
    >
      <TourGuideProviderInner>
        {children}
      </TourGuideProviderInner>
    </SpotlightTourProvider>
  );
};

// Hook to get tour controller (replaces useTourGuideController)
export const useTourGuideController = (): TourController => {
  const context = useContext(TourContext);
  
  if (!context) {
    // Return a no-op controller if not in a tour context
    return {
      canStart: false,
      start: () => {},
      stop: () => {},
      eventEmitter: null,
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

// Zone component (replaces TourGuideZone from rn-tourguide)
export const TourGuideZone: React.FC<TourGuideZoneProps> = ({
  zone,
  text,
  children,
  shape = 'rectangle',
  borderRadius = 8,
  style,
}) => {
  const context = useContext(TourContext);
  const ref = useRef<View>(null);

  React.useEffect(() => {
    if (context && ref.current) {
      context.registerStep(zone, ref as React.RefObject<View>);
      return () => context.unregisterStep(zone);
    }
  }, [context, zone]);

  // For now, just render children - full tour integration will be added later
  return (
    <View ref={ref} style={style} collapsable={false}>
      {children}
    </View>
  );
};

export default TourGuideProvider;
