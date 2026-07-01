/**
 * MetrifulLidar — on-demand LiDAR depth measurement (iOS, LiDAR devices only).
 *
 * Returns a single center-of-frame distance + camera focal length at capture time, which
 * `estimateImageWidthCm` (src/utils/scale.ts) converts into the real-world frame width (img_w_cm)
 * the backend uses to break monocular portion-scale ambiguity.
 *
 * Safe on web / non-LiDAR / Expo Go: the native module is absent, so every call resolves to
 * { hasDepth: false } and callers fall back to the default plate-width assumption — never fabricates.
 */
import { Platform } from 'react-native';

export interface LidarReading {
  hasDepth: boolean;
  /** camera-to-subject distance in centimeters */
  distanceCm?: number;
  /** distance in meters */
  distance?: number;
  /** focal length in pixels, matching `width` */
  fx?: number;
  /** depth-map width in pixels (matches fx) */
  width?: number;
  /** 0–1; LiDAR absolute depth ≈ 0.95 */
  confidence?: number;
  accuracy?: 'absolute' | 'relative';
  // --- on-device portion geometry (feeds the calorie corrector) ---
  /** integrated food volume above the plate plane, cm³ */
  volumeCm3?: number;
  /** food footprint area, cm² */
  areaCm2?: number;
  /** mean food height above the plate, cm */
  meanHCm?: number;
  /** number of food depth pixels */
  npx?: number;
  /** why depth was unavailable, when hasDepth=false */
  reason?: string;
}

interface MetrifulLidarNative {
  isAvailable(): boolean;
  measure(): Promise<LidarReading>;
}

let native: MetrifulLidarNative | null = null;
if (Platform.OS === 'ios') {
  try {
    // Lazily required so web/Android bundles don't fail when the module isn't linked.
    const { requireNativeModule } = require('expo-modules-core');
    native = requireNativeModule('MetrifulLidar') as MetrifulLidarNative;
  } catch {
    native = null;
  }
}

/** True only on a real LiDAR iPhone/iPad with the module compiled in. */
export function isLidarAvailable(): boolean {
  try {
    return native?.isAvailable() ?? false;
  } catch {
    return false;
  }
}

/** Take one LiDAR depth reading. Always resolves; never throws. */
export async function measureLidar(): Promise<LidarReading> {
  if (!native) return { hasDepth: false, reason: 'module_unavailable' };
  try {
    return await native.measure();
  } catch (e) {
    return { hasDepth: false, reason: `error:${String(e)}` };
  }
}

export default { isLidarAvailable, measureLidar };
