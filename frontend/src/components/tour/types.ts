export interface TourStep {
  zone: number;
  title: string;
  text: string;
  icon?: string;
  shape?: 'rectangle' | 'circle';
  borderRadius?: number;
}

export interface ZoneLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

import type { RefObject } from 'react';
import type { ScrollView, View } from 'react-native';

export interface TourContextValue {
  registerStep: (step: TourStep) => void;
  unregisterStep: (zone: number) => void;
  registerLayout: (zone: number, layout: ZoneLayout) => void;
  registerZoneRef: (zone: number, ref: RefObject<View>) => void;
  scrollToZone: (zone: number, scrollViewRef: RefObject<ScrollView> | null) => void;
  isActive: boolean;
  currentZone: number | null;
  start: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
}

