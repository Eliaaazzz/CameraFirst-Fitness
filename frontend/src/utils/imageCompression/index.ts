/**
 * Image Compression Module
 *
 * High-performance, platform-aware image compression for React Native / Expo
 *
 * Features:
 * - Web: Web Worker + OffscreenCanvas (zero main-thread blocking)
 * - Native: expo-image-manipulator
 * - Fallback: Main-thread Canvas for older browsers
 * - Progress tracking
 * - Memory-safe cleanup
 */

export {
  compressImage,
  uriToBlob,
  blobToBase64,
  terminateWorker,
} from './compressionService';

export type {
  CompressionOptions,
  CompressionResult,
  CompressionProgress,
} from './types';
