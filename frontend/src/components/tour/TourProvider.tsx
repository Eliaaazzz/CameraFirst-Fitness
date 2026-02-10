import { useNavigation } from '@react-navigation/native';
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
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { ALL_TOUR_STEPS } from '@/config/tourSteps';
import { SpotlightOverlay } from './SpotlightOverlay';
import { Tooltip } from './Tooltip';
import { TourContextValue, TourStep, ZoneLayout } from './types';

// --- Contexts ---

const TourContext = createContext<TourContextValue | null>(null);

// ScrollView ref context for auto-scrolling
const ScrollViewContext = createContext<React.RefObject<ScrollView> | null>(null);

// Zone to screen mapping - defines which screen each zone is on
const getScreenForZone = (zone: number): string => {
  const step = ALL_TOUR_STEPS.find((entry) => entry.zone === zone);
  return step?.screen ?? 'Dashboard';
};

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
  const [showTooltip, setShowTooltip] = useState(false);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Ref storage for zone View refs (for scrolling)
  const zoneRefsMap = useRef<Map<number, React.RefObject<View>>>(new Map());
  const scrollViewRefsMap = useRef<Map<string, React.RefObject<ScrollView>>>(new Map());

  // Navigation callback ref
  const navigationCallbackRef = useRef<((screen: string) => void) | null>(null);
  const currentScreenRef = useRef<string>('Dashboard');

  // All zones from tour steps config
  const allZones = useMemo(() => ALL_TOUR_STEPS.map(s => s.zone).sort((a, b) => a - b), []);

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
    zoneRefsMap.current.delete(zone);
  }, []);

  const registerLayout = useCallback((zone: number, layout: ZoneLayout) => {
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

  const registerZoneRef = useCallback((zone: number, ref: React.RefObject<View>) => {
    zoneRefsMap.current.set(zone, ref);
  }, []);

  const registerScrollViewRef = useCallback((screen: string, ref: React.RefObject<ScrollView>) => {
    scrollViewRefsMap.current.set(screen, ref);
  }, []);

  const setNavigationCallback = useCallback((callback: (screen: string) => void) => {
    navigationCallbackRef.current = (screen: string) => {
      currentScreenRef.current = screen;
      callback(screen);
    };
  }, []);

  // Scroll to a specific zone
  const scrollToZone = useCallback((zone: number, scrollViewRef: React.RefObject<ScrollView> | null) => {
    const screen = getScreenForZone(zone);
    const effectiveScrollRef = scrollViewRef || scrollViewRefsMap.current.get(screen);
    if (!effectiveScrollRef?.current) return;

    const ref = zoneRefsMap.current.get(zone);
    if (!ref?.current) return;

    ref.current.measureLayout(
      effectiveScrollRef.current as any,
      (x, y) => {
        const scrollY = Math.max(0, y - 100);
        effectiveScrollRef.current?.scrollTo({ y: scrollY, animated: true });
      },
      () => {
        // If the zone isn't a descendant of this ScrollView, `measureLayout` fails.
        // Avoid trying to derive a ScrollView offset from `measureInWindow` (window coords),
        // and just let the spotlight render based on the registered layout.
      }
    );
  }, []);

  // Event emitter
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
    setShowTooltip(false);
    emit('stop');
  }, [emit]);

  // Navigate to zone - handles cross-screen navigation
  const goToZone = useCallback((zone: number) => {
    const prevZone = activeZone;
    const targetScreen = getScreenForZone(zone);
    const prevScreen = prevZone !== null ? getScreenForZone(prevZone) : currentScreenRef.current;
    const isCrossScreen = targetScreen !== prevScreen;

    // Check if this is the first step (zone 1 starting from null)
    const isFirstStep = prevZone === null && zone === 1;

    // Hide tooltip while transitioning
    setShowTooltip(false);
    setActiveZone(zone);

    // Navigate to target screen if needed
    if (isCrossScreen && navigationCallbackRef.current) {
      navigationCallbackRef.current(targetScreen);
    }

    // For first step, use longer delays to ensure scroll completes before showing tooltip
    // Elements may be below viewport and need time to scroll into view
    const navDelay = isFirstStep ? 100 : (isCrossScreen ? 150 : 50);
    const scrollDelay = isFirstStep ? 350 : (isCrossScreen ? 50 : 50);

    setTimeout(() => {
      scrollToZone(zone, null);
      setTimeout(() => {
        setShowTooltip(true);
      }, scrollDelay);
    }, navDelay);
  }, [activeZone, scrollToZone]);

  const start = useCallback(() => {
    if (allZones.length > 0) {
      setIsActive(true);
      emit('start');
      goToZone(allZones[0]);
    }
  }, [allZones, emit, goToZone]);

  const next = useCallback(() => {
    if (activeZone === null) return;
    const idx = allZones.indexOf(activeZone);
    if (idx < allZones.length - 1) {
      goToZone(allZones[idx + 1]);
    } else {
      stop();
    }
  }, [activeZone, allZones, goToZone, stop]);

  const previous = useCallback(() => {
    if (activeZone === null) return;
    const idx = allZones.indexOf(activeZone);
    if (idx > 0) {
      goToZone(allZones[idx - 1]);
    }
  }, [activeZone, allZones, goToZone]);

  // Get step info from config
  const currentStepInfo = activeZone !== null
    ? ALL_TOUR_STEPS.find(s => s.zone === activeZone)
    : null;

  const currentLayout = activeZone !== null ? layouts.get(activeZone) : null;
  const currentIndex = activeZone !== null ? allZones.indexOf(activeZone) : -1;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === allZones.length - 1;

  const currentStep: TourStep | null = currentStepInfo ? {
    zone: currentStepInfo.zone,
    title: currentStepInfo.title,
    text: currentStepInfo.text,
    shape: 'rectangle',
    borderRadius: 12,
  } : null;

  const value = useMemo(() => ({
    registerStep,
    unregisterStep,
    registerLayout,
    registerZoneRef,
    scrollToZone,
    isActive,
    currentZone: activeZone,
    start,
    stop,
    next,
    previous,
  }), [registerStep, unregisterStep, registerLayout, registerZoneRef, scrollToZone, isActive, activeZone, start, stop, next, previous]);

  // Controller for hook
  const controller = useMemo(() => ({
    start, stop, canStart: allZones.length > 0,
    eventEmitter: { on, off }
  }), [start, stop, allZones.length, on, off]);

  // Extended context with navigation helpers
  const extendedValue = useMemo(() => ({
    ...value,
    registerScrollViewRef,
    setNavigationCallback,
  }), [value, registerScrollViewRef, setNavigationCallback]);

  return (
    <TourContext.Provider value={extendedValue as TourContextValue}>
      <TourControllerContext.Provider value={{ controller }}>
        {children}
        <Modal
          transparent
          visible={isActive && showTooltip && !!currentStep && !!currentLayout}
          animationType="fade"
          onRequestClose={stop}
        >
          {isActive && showTooltip && currentStep && currentLayout ? (
            <View style={StyleSheet.absoluteFill}>
              <SpotlightOverlay
                layout={currentLayout}
                shape={currentStep.shape}
                borderRadius={currentStep.borderRadius}
                windowWidth={windowWidth}
                windowHeight={windowHeight}
                backdropColor={backdropColor}
                onBackdropPress={stop}
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
                totalSteps={allZones.length}
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

  const registerStep = context?.registerStep;
  const unregisterStep = context?.unregisterStep;
  const registerLayout = context?.registerLayout;
  const registerZoneRef = context?.registerZoneRef;
  const isActive = context?.isActive;
  const currentZone = context?.currentZone;

  // Register step on mount
  useEffect(() => {
    if (registerStep && unregisterStep) {
      registerStep({ zone, title, text, icon, shape, borderRadius });
      return () => unregisterStep(zone);
    }
  }, [registerStep, unregisterStep, zone, text, title, icon, shape, borderRadius]);

  // Register ref for scrolling
  useEffect(() => {
    if (registerZoneRef && ref.current) {
      registerZoneRef(zone, ref as React.RefObject<View>);
    }
  }, [registerZoneRef, zone]);

  // Measure layout
  const measure = useCallback(() => {
    if (ref.current && registerLayout) {
      ref.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          registerLayout(zone, { x, y, width, height });
        }
      });
    }
  }, [registerLayout, zone]);

  // Measure on mount and when this zone is active
  useEffect(() => {
    measure();

    if (isActive && currentZone === zone) {
      const interval = setInterval(measure, 100);
      return () => clearInterval(interval);
    }
  }, [measure, isActive, currentZone, zone]);

  return (
    <View
      ref={ref}
      onLayout={measure}
      style={style}
      collapsable={false}
    >
      {children}
    </View>
  );
};

// ScrollView wrapper that registers with tour context
interface TourScrollViewProps {
  children: ReactNode;
  style?: any;
  contentContainerStyle?: any;
  refreshControl?: React.ReactElement<any>;
  showsVerticalScrollIndicator?: boolean;
  screenName?: string;
  [key: string]: any;
}

export const TourScrollView: React.FC<TourScrollViewProps> = ({
  children,
  style,
  contentContainerStyle,
  refreshControl,
  screenName = 'Dashboard',
  ...props
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const context = useContext(TourContext);

  useEffect(() => {
    if (context && (context as any).registerScrollViewRef && scrollRef.current) {
      (context as any).registerScrollViewRef(screenName, scrollRef);
    }
  }, [context, screenName]);

  return (
    <ScrollViewContext.Provider value={scrollRef as React.RefObject<ScrollView>}>
      <ScrollView
        ref={scrollRef}
        style={style}
        contentContainerStyle={contentContainerStyle}
        refreshControl={refreshControl}
        {...props}
      >
        {children}
      </ScrollView>
    </ScrollViewContext.Provider>
  );
};

// Hook to register navigation callback - call in main screen
export const useTourNavigation = () => {
  const context = useContext(TourContext);
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (context && (context as any).setNavigationCallback) {
      (context as any).setNavigationCallback((screen: string) => {
        console.log('[Tour] Navigating to:', screen);
        navigation.navigate(screen);
      });
    }
  }, [context, navigation]);
};

// Controller context and hook

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
