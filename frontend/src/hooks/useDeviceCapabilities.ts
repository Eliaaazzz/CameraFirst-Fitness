/**
 * Device Capabilities Detection Hook
 *
 * Detects hardware features for progressive enhancement:
 * - Tier 1 (LiDAR/ToF): iPhone 12 Pro+, iPad Pro, Samsung Ultra, etc.
 * - Tier 2 (Standard AR): Most modern phones with ARKit/ARCore support
 * - Tier 3 (Fallback): Basic camera only
 */

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

export type DeviceTier = 'lidar' | 'standard_ar' | 'basic';

export interface DeviceCapabilities {
  tier: DeviceTier;
  hasLiDAR: boolean;
  hasToF: boolean;
  hasARSupport: boolean;
  deviceModel: string;
  isHighEnd: boolean;
  estimatedAccuracy: string; // e.g., "< 1%", "< 5%", "< 15%"
}

// iPhone models with LiDAR (Pro models from iPhone 12 onwards)
const LIDAR_IPHONE_MODELS = [
  'iPhone13,3', 'iPhone13,4', // iPhone 12 Pro, Pro Max
  'iPhone14,2', 'iPhone14,3', // iPhone 13 Pro, Pro Max
  'iPhone14,4', 'iPhone14,5', // iPhone 13 mini, iPhone 13 (no LiDAR but check)
  'iPhone15,2', 'iPhone15,3', // iPhone 14 Pro, Pro Max
  'iPhone16,1', 'iPhone16,2', // iPhone 15 Pro, Pro Max
  'iPhone17,1', 'iPhone17,2', // iPhone 16 Pro, Pro Max (future)
];

// iPad Pro models with LiDAR (2020+)
const LIDAR_IPAD_MODELS = [
  'iPad8,9', 'iPad8,10', 'iPad8,11', 'iPad8,12', // iPad Pro 2020
  'iPad13,4', 'iPad13,5', 'iPad13,6', 'iPad13,7', // iPad Pro 2021
  'iPad14,3', 'iPad14,4', 'iPad14,5', 'iPad14,6', // iPad Pro 2022
];

// Android models known to have ToF sensors
const TOF_ANDROID_MODELS = [
  'SM-S918', 'SM-S928', // Samsung S23/S24 Ultra
  'SM-N986', 'SM-N981', // Samsung Note 20 Ultra
  'Pixel 7 Pro', 'Pixel 8 Pro', 'Pixel 9 Pro', // Google Pixel Pro
  'HUAWEI P40 Pro', 'HUAWEI P50 Pro', 'HUAWEI Mate 40 Pro',
];

function checkLiDARSupport(modelId: string): boolean {
  if (Platform.OS === 'ios') {
    // Check if it's a Pro model
    return LIDAR_IPHONE_MODELS.some(model => modelId.includes(model)) ||
           LIDAR_IPAD_MODELS.some(model => modelId.includes(model)) ||
           modelId.toLowerCase().includes('pro');
  }
  return false;
}

function checkToFSupport(modelId: string, modelName: string): boolean {
  if (Platform.OS === 'android') {
    return TOF_ANDROID_MODELS.some(model =>
      modelId.includes(model) || modelName.includes(model)
    );
  }
  return false;
}

function checkARSupport(osVersion: string): boolean {
  if (Platform.OS === 'ios') {
    // ARKit requires iOS 11+ and A9 chip or later
    const majorVersion = parseInt(osVersion.split('.')[0], 10);
    return majorVersion >= 11;
  } else if (Platform.OS === 'android') {
    // ARCore requires Android 7.0+ (API 24)
    const majorVersion = parseInt(osVersion.split('.')[0], 10);
    return majorVersion >= 7;
  }
  return false;
}

export function useDeviceCapabilities(): DeviceCapabilities {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    tier: 'basic',
    hasLiDAR: false,
    hasToF: false,
    hasARSupport: false,
    deviceModel: 'unknown',
    isHighEnd: false,
    estimatedAccuracy: '< 15%',
  });

  useEffect(() => {
    const detectCapabilities = async () => {
      try {
        const modelId = Device.modelId || '';
        const modelName = Device.modelName || '';
        const osVersion = Device.osVersion || '';
        const brand = Device.brand || '';

        const hasLiDAR = checkLiDARSupport(modelId);
        const hasToF = checkToFSupport(modelId, modelName);
        const hasARSupport = checkARSupport(osVersion);

        // Determine tier
        let tier: DeviceTier = 'basic';
        let estimatedAccuracy = '< 15%';
        let isHighEnd = false;

        if (hasLiDAR || hasToF) {
          tier = 'lidar';
          estimatedAccuracy = '< 1%';
          isHighEnd = true;
        } else if (hasARSupport) {
          tier = 'standard_ar';
          estimatedAccuracy = '< 5%';
          isHighEnd = brand.toLowerCase().includes('apple') ||
                      brand.toLowerCase().includes('samsung') ||
                      brand.toLowerCase().includes('google');
        }

        setCapabilities({
          tier,
          hasLiDAR,
          hasToF,
          hasARSupport,
          deviceModel: modelName || modelId,
          isHighEnd,
          estimatedAccuracy,
        });

        if (__DEV__) {
          console.log('[DeviceCapabilities] Detected:', {
            tier,
            hasLiDAR,
            hasToF,
            hasARSupport,
            model: modelName || modelId,
            osVersion,
          });
        }
      } catch (error) {
        console.warn('[DeviceCapabilities] Detection failed:', error);
        // Fallback to basic tier
      }
    };

    detectCapabilities();
  }, []);

  return capabilities;
}

/**
 * Get a human-readable description of the device tier
 */
export function getTierDescription(tier: DeviceTier): string {
  switch (tier) {
    case 'lidar':
      return 'Pro Accuracy (LiDAR)';
    case 'standard_ar':
      return 'Standard Accuracy (AR)';
    case 'basic':
    default:
      return 'Basic Mode';
  }
}

export default useDeviceCapabilities;
