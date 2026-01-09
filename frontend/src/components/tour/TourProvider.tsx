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
  Modal,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { SpotlightOverlay } from './SpotlightOverlay';
import { Tooltip } from './Tooltip';
import { TourContextValue, TourStep, ZoneLayout } from './types';

// --- Contexts ---

const TourContext = createContext<TourContextValue | null>(null);

// --- Components ---

// Provider Component
export const TourGuideProvider: React.FC<{
  children: ReactNode;
  backdropColor?: string;
}> = ({ children, backdropColor = 'rgba(0, 0, 0, 0.7)' }) => {
  const [steps, setSteps] = useState<Map<number, TourStep>>(new Map());
  const [layouts, setLayouts] = useState<Map<number, ZoneLayout>>(new Map());
  const [activeZone, setActiveZone] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Helper to get sorted zones
  const sortedZones = useMemo(() => Array.from(steps.keys()).sort((a, b) => a - b), [steps]);

  const registerStep = useCallback((step: TourStep) => {
    setSteps(prev => new Map(prev).set(step.zone, step));
  }, []);

  const unregisterStep = useCallback((zone: number) => {
    setSteps(prev => {
      const newMap = new Map(prev);
      newMap.delete(zone);
      return newMap;
    });
    setLayouts(prev => {
      const newMap = new Map(prev);
      newMap.delete(zone);
      return newMap;
    });
  }, []);

  const registerLayout = useCallback((zone: number, layout: ZoneLayout) => {
    // Only update if changed significantly to avoid loops
    setLayouts(prev => {
      const current = prev.get(zone);
      if (current && 
          Math.abs(current.x - layout.x) < 1 && 
          Math.abs(current.y - layout.y) < 1 &&
          Math.abs(current.width - layout.width) < 1 &&
          Math.abs(current.height - layout.height) < 1) {
        return prev;
      }
      return new Map(prev).set(zone, layout);
    });
  }, []);

  const start = useCallback(() => {
    if (sortedZones.length > 0) {
      setActiveZone(sortedZones[0]);
      setIsActive(true);
    }
  }, [sortedZones]);

  // Simple event emitter
  const listenersRef = useRef<Map<string, Set<() => void>>>(new Map());

  const on = useCallback((event: string, callback: () => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)?.add(callback);
  }, []);

  const off = useCallback((event: string, callback: () => void) => {
    listenersRef.current.get(event)?.delete(callback);
  }, []);

  const emit = useCallback((event: string) => {
    listenersRef.current.get(event)?.forEach(cb => cb());
  }, []);

  const stop = useCallback(() => {
    setIsActive(false);
    setActiveZone(null);
    emit('stop');
  }, [emit]);

  const next = useCallback(() => {
    if (activeZone === null) return;
    const idx = sortedZones.indexOf(activeZone);
    if (idx < sortedZones.length - 1) {
      setActiveZone(sortedZones[idx + 1]);
    } else {
      stop();
    }
  }, [activeZone, sortedZones, stop]);

  const previous = useCallback(() => {
    if (activeZone === null) return;
    const idx = sortedZones.indexOf(activeZone);
    if (idx > 0) {
      setActiveZone(sortedZones[idx - 1]);
    }
  }, [activeZone, sortedZones]);

  // Derived state for render
  const currentStep = activeZone !== null ? steps.get(activeZone) : null;
  const currentLayout = activeZone !== null ? layouts.get(activeZone) : null;
  const currentIndex = activeZone !== null ? sortedZones.indexOf(activeZone) : -1;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === sortedZones.length - 1;

  const value = useMemo(() => ({
    registerStep,
    unregisterStep,
    registerLayout,
    isActive,
    currentZone: activeZone,
    start,
    stop,
    next,
    previous,
  }), [registerStep, unregisterStep, registerLayout, isActive, activeZone, start, stop, next, previous]);

  // Controller Context for hook
  const controller = useMemo(() => ({
    start, stop, canStart: sortedZones.length > 0,
    eventEmitter: { on, off }
  }), [start, stop, sortedZones.length, on, off]);

  return (
    <TourContext.Provider value={value}>
      <TourControllerContext.Provider value={{ controller }}>
        {children}
        <Modal
          transparent
          visible={isActive && !!currentStep}
          animationType="fade"
          onRequestClose={stop}
        >
          {isActive && currentStep && currentLayout ? (
            <View style={StyleSheet.absoluteFill}>
              <SpotlightOverlay
                layout={currentLayout}
                shape={currentStep.shape}
                borderRadius={currentStep.borderRadius}
                windowWidth={windowWidth}
                windowHeight={windowHeight}
                backdropColor={backdropColor}
                onBackdropPress={stop} // Optional: Next or Stop on backdrop click
              />
              <Tooltip
                step={currentStep}
                layout={currentLayout}
                onNext={next}
                onPrev={previous}
                onStop={stop}
                isFirst={isFirst}
                isLast={isLast}
                windowWidth={windowWidth}
                windowHeight={windowHeight}
                currentStepIndex={currentIndex}
                totalSteps={sortedZones.length}
              />
            </View>
          ) : null}
        </Modal>
      </TourControllerContext.Provider>
    </TourContext.Provider>
  );
};

// Tour Guide Zone Component
export const TourGuideZone: React.FC<{
  zone: number;
  text: string;
  title?: string;
  icon?: string;
  shape?: 'rectangle' | 'circle';
  borderRadius?: number;
  children: ReactNode;
  style?: any;
}> = ({ zone, text, title = '', icon, shape, borderRadius, children, style }) => {
  const context = useContext(TourContext);
  const ref = useRef<View>(null);

  useEffect(() => {
    if (context) {
      context.registerStep({ zone, title, text, icon, shape, borderRadius });
      return () => context.unregisterStep(zone);
    }
  }, [context, zone, text, title, icon, shape, borderRadius]);

  // Measure loop (or trigger on layout)
  const measure = useCallback(() => {
    if (ref.current && context) {
      ref.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          context.registerLayout(zone, { x, y, width, height });
        }
      });
    }
  }, [context, zone]);

  // Measure on mount and periodically to handle layout shifts
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const loop = () => {
      measure();
      timeout = setTimeout(loop, 1000); // Poll every second for safety
    };
    loop();
    return () => clearTimeout(timeout);
  }, [measure]);

  return (
    <View 
      ref={ref} 
      onLayout={measure} // Also trigger on layout change
      style={style}
      collapsable={false} // Important for Android measurement
    >
      {children}
    </View>
  );
};

// Hooks & Controller (Backward Compatibility)

interface TourController {
  start: () => void;
  stop: () => void;
  canStart: boolean;
  eventEmitter: any; 
}

const TourControllerContext = createContext<{ controller: TourController } | null>(null);

export const useTourGuideController = () => {
  const context = useContext(TourControllerContext);
  if (!context) throw new Error("useTourGuideController must be used within TourGuideProvider");
  return context.controller;
};

export default TourGuideProvider;
