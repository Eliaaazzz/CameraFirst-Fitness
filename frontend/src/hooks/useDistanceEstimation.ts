/**
 * Distance Estimation Hook
 *
 * Provides adaptive distance measurement based on device capabilities:
 *
 * Tier 1 (LiDAR/ToF): Real-time depth from sensor - instant, < 1% error
 * Tier 2 (AR): Plane detection with raycasting - ~0.5s calibration, < 5% error
 * Tier 3 (Basic): UI-based reference guide - user-assisted, < 15% error
 *
 * For now, this is a simplified implementation that:
 * 1. Detects device tier
 * 2. Simulates distance estimation (real implementation needs native modules)
 * 3. Provides status updates for the MagicReticle UI
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceTier, useDeviceCapabilities } from './useDeviceCapabilities';

export type EstimationStatus =
  | 'idle'
  | 'initializing'
  | 'calibrating'
  | 'ready'
  | 'too_close'
  | 'too_far'
  | 'error';

export interface DistanceEstimation {
  status: EstimationStatus;
  distance: number | null; // in centimeters
  confidence: number; // 0-1
  accuracy: string; // e.g., "±1cm", "±3cm"
  deviceTier: DeviceTier;
  isReady: boolean;
}

export interface UseDistanceEstimationOptions {
  /** Minimum acceptable distance in cm (default: 20) */
  minDistance?: number;
  /** Maximum acceptable distance in cm (default: 60) */
  maxDistance?: number;
  /** Ideal distance in cm (default: 35) */
  idealDistance?: number;
  /** Auto-start estimation on mount (default: true) */
  autoStart?: boolean;
  /** Callback when distance is locked and ready */
  onReady?: (distance: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<UseDistanceEstimationOptions, 'onReady'>> = {
  minDistance: 20,
  maxDistance: 60,
  idealDistance: 35,
  autoStart: true,
};

export function useDistanceEstimation(
  options: UseDistanceEstimationOptions = {}
): DistanceEstimation & {
  start: () => void;
  stop: () => void;
  reset: () => void;
  setManualDistance: (cm: number) => void;
} {
  const { minDistance, maxDistance, idealDistance, autoStart } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const capabilities = useDeviceCapabilities();
  const [status, setStatus] = useState<EstimationStatus>('idle');
  const [distance, setDistance] = useState<number | null>(null);
  const [confidence, setConfidence] = useState(0);

  const isRunningRef = useRef(false);
  const calibrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calculate accuracy based on tier
  const accuracy = capabilities.tier === 'lidar'
    ? '±1cm'
    : capabilities.tier === 'standard_ar'
    ? '±3cm'
    : '±5cm';

  const start = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    setStatus('initializing');
    setConfidence(0);

    // Different initialization based on tier
    if (capabilities.tier === 'lidar') {
      // LiDAR: Nearly instant (simulate with short delay)
      setTimeout(() => {
        if (!isRunningRef.current) return;

        // In real implementation, this would read from depth buffer
        // For now, simulate a good distance
        const simulatedDistance = idealDistance + (Math.random() - 0.5) * 10;
        setDistance(Math.round(simulatedDistance));
        setConfidence(0.99);
        setStatus('ready');

        options.onReady?.(Math.round(simulatedDistance));
      }, 200);
    } else if (capabilities.tier === 'standard_ar') {
      // AR: Needs calibration time
      setStatus('calibrating');

      calibrationTimerRef.current = setTimeout(() => {
        if (!isRunningRef.current) return;

        // Simulate AR plane detection success
        const simulatedDistance = idealDistance + (Math.random() - 0.5) * 15;
        setDistance(Math.round(simulatedDistance));
        setConfidence(0.85);
        setStatus('ready');

        options.onReady?.(Math.round(simulatedDistance));
      }, 1500);
    } else {
      // Basic: Use default/manual distance
      setDistance(idealDistance);
      setConfidence(0.7);
      setStatus('ready');

      options.onReady?.(idealDistance);
    }
  }, [capabilities.tier, idealDistance, options]);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    if (calibrationTimerRef.current) {
      clearTimeout(calibrationTimerRef.current);
      calibrationTimerRef.current = null;
    }
    setStatus('idle');
  }, []);

  const reset = useCallback(() => {
    stop();
    setDistance(null);
    setConfidence(0);
  }, [stop]);

  const setManualDistance = useCallback((cm: number) => {
    // Validate range
    if (cm < minDistance) {
      setStatus('too_close');
      setDistance(cm);
      setConfidence(0.5);
    } else if (cm > maxDistance) {
      setStatus('too_far');
      setDistance(cm);
      setConfidence(0.5);
    } else {
      setStatus('ready');
      setDistance(cm);
      setConfidence(capabilities.tier === 'basic' ? 0.7 : 0.9);
      options.onReady?.(cm);
    }
  }, [minDistance, maxDistance, capabilities.tier, options]);

  // Auto-start on mount if enabled
  useEffect(() => {
    if (autoStart && capabilities.tier !== 'basic') {
      // Small delay to let camera initialize
      const timer = setTimeout(start, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart, capabilities.tier, start]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    status,
    distance,
    confidence,
    accuracy,
    deviceTier: capabilities.tier,
    isReady: status === 'ready',
    start,
    stop,
    reset,
    setManualDistance,
  };
}

/**
 * Convert distance estimation status to MagicReticle state
 */
export function toReticleState(
  status: EstimationStatus
): 'searching' | 'calibrating' | 'ready' | 'too_close' | 'too_far' {
  switch (status) {
    case 'idle':
    case 'initializing':
    case 'error':
      return 'searching';
    case 'calibrating':
      return 'calibrating';
    case 'too_close':
      return 'too_close';
    case 'too_far':
      return 'too_far';
    case 'ready':
    default:
      return 'ready';
  }
}

export default useDistanceEstimation;
