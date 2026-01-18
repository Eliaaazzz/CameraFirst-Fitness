/**
 * Image Compression Service
 *
 * Platform-aware image compression with graceful fallback:
 * - Web: Uses Web Worker + OffscreenCanvas for zero main-thread blocking
 * - Native (iOS/Android): Uses expo-image-manipulator
 * - Fallback: Main-thread canvas compression for older browsers
 *
 * Architecture:
 * ┌─────────────────┐
 * │  useImageCompressor │
 * └────────┬────────┘
 *          │
 *    ┌─────▼─────┐
 *    │ Platform? │
 *    └─────┬─────┘
 *          │
 *    ┌─────┴─────┬──────────────┐
 *    ▼           ▼              ▼
 * [Web]      [Native]      [Fallback]
 * Worker     Expo          Canvas
 */

import { Platform } from 'react-native';
import type {
  CompressionOptions,
  CompressionResult,
  CompressionProgress,
  WorkerMessageType,
  WorkerResponseType,
} from './types';

// Feature detection flags
let workerSupported: boolean | null = null;
let offscreenCanvasSupported: boolean | null = null;

/**
 * Check if Web Workers + OffscreenCanvas are supported
 */
function checkWebWorkerSupport(): boolean {
  if (Platform.OS !== 'web') return false;

  if (workerSupported !== null && offscreenCanvasSupported !== null) {
    return workerSupported && offscreenCanvasSupported;
  }

  try {
    workerSupported = typeof Worker !== 'undefined';
    offscreenCanvasSupported =
      typeof OffscreenCanvas !== 'undefined' &&
      typeof createImageBitmap !== 'undefined';

    console.log('[CompressionService] Worker support:', workerSupported);
    console.log('[CompressionService] OffscreenCanvas support:', offscreenCanvasSupported);

    return workerSupported && offscreenCanvasSupported;
  } catch {
    return false;
  }
}

// Singleton worker instance (lazy initialized)
let workerInstance: Worker | null = null;
let workerCallbacks = new Map<
  string,
  {
    resolve: (result: CompressionResult) => void;
    reject: (error: Error) => void;
    onProgress?: (progress: CompressionProgress) => void;
    originalSize: number;
  }
>();

/**
 * Get or create the worker instance
 */
function getWorker(): Worker {
  if (!workerInstance) {
    // Dynamic import of the worker
    // Note: This requires bundler configuration (webpack/metro) to handle .worker.ts files
    // For Expo web, we use a blob URL approach
    const workerCode = `
      ${imageWorkerCode}
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    workerInstance = new Worker(workerUrl);

    workerInstance.onmessage = (event: MessageEvent<WorkerResponseType>) => {
      const message = event.data;
      const callback = workerCallbacks.get(message.id);

      if (!callback) return;

      if (message.type === 'progress' && callback.onProgress) {
        callback.onProgress(message.progress);
      }

      if (message.type === 'success') {
        const { blob: arrayBuffer, width, height, size, originalSize, duration } = message.result;
        const resultBlob = new Blob([arrayBuffer], { type: 'image/jpeg' });

        callback.resolve({
          blob: resultBlob,
          width,
          height,
          size,
          originalSize,
          ratio: size / originalSize,
          duration,
        });
        workerCallbacks.delete(message.id);
      }

      if (message.type === 'error') {
        callback.reject(new Error(message.error));
        workerCallbacks.delete(message.id);
      }
    };

    workerInstance.onerror = (error) => {
      console.error('[CompressionService] Worker error:', error);
      // Reject all pending callbacks
      workerCallbacks.forEach((callback, id) => {
        callback.reject(new Error('Worker crashed'));
        workerCallbacks.delete(id);
      });
    };
  }

  return workerInstance;
}

// Inline worker code (will be used to create blob URL)
const imageWorkerCode = `
const compressImage = async (imageData, mimeType, options, sendProgress) => {
  const { maxDimension = 1024, quality = 0.8, format = 'image/jpeg', targetSize } = options;

  sendProgress('loading', 10);
  const sourceBlob = new Blob([imageData], { type: mimeType });
  const imageBitmap = await createImageBitmap(sourceBlob);
  sendProgress('loading', 30);

  const { width: origWidth, height: origHeight } = imageBitmap;
  let newWidth = origWidth;
  let newHeight = origHeight;

  if (origWidth > maxDimension || origHeight > maxDimension) {
    if (origWidth >= origHeight) {
      newWidth = maxDimension;
      newHeight = Math.round((origHeight / origWidth) * maxDimension);
    } else {
      newHeight = maxDimension;
      newWidth = Math.round((origWidth / origHeight) * maxDimension);
    }
  }

  sendProgress('resizing', 50);
  const canvas = new OffscreenCanvas(newWidth, newHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');

  ctx.drawImage(imageBitmap, 0, 0, newWidth, newHeight);
  imageBitmap.close();
  sendProgress('compressing', 70);

  let resultBlob = await canvas.convertToBlob({ type: format, quality });

  if (targetSize && resultBlob.size > targetSize) {
    let currentQuality = quality;
    const minQuality = 0.3;
    while (resultBlob.size > targetSize && currentQuality > minQuality) {
      currentQuality -= 0.1;
      resultBlob = await canvas.convertToBlob({ type: format, quality: Math.max(currentQuality, minQuality) });
    }
  }

  sendProgress('complete', 100);
  return { blob: resultBlob, width: newWidth, height: newHeight };
};

self.onmessage = async (event) => {
  const message = event.data;
  if (message.type === 'compress') {
    const { id, imageData, options, mimeType } = message;
    const startTime = performance.now();
    const originalSize = imageData.byteLength;

    const sendProgress = (stage, progress) => {
      self.postMessage({ type: 'progress', id, progress: { stage, progress } });
    };

    try {
      const { blob, width, height } = await compressImage(imageData, mimeType, options, sendProgress);
      const resultBuffer = await blob.arrayBuffer();
      const duration = performance.now() - startTime;
      self.postMessage({
        type: 'success',
        id,
        result: { blob: resultBuffer, width, height, size: blob.size, originalSize, duration }
      }, [resultBuffer]);
    } catch (error) {
      self.postMessage({ type: 'error', id, error: error.message || 'Unknown error' });
    }
  }
};
`;

/**
 * Generate unique ID for worker requests
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Compress image using Web Worker (non-blocking)
 */
async function compressWithWorker(
  file: File | Blob,
  options: CompressionOptions,
  onProgress?: (progress: CompressionProgress) => void
): Promise<CompressionResult> {
  const worker = getWorker();
  const id = generateId();
  const originalSize = file.size;

  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  const mimeType = file.type || 'image/jpeg';

  return new Promise((resolve, reject) => {
    workerCallbacks.set(id, {
      resolve,
      reject,
      onProgress,
      originalSize,
    });

    const message: WorkerMessageType = {
      type: 'compress',
      id,
      imageData: arrayBuffer,
      options,
      mimeType,
    };

    // Transfer the ArrayBuffer (zero-copy to worker)
    worker.postMessage(message, [arrayBuffer]);
  });
}

/**
 * Compress image using main-thread Canvas (fallback for older browsers)
 */
async function compressWithCanvas(
  file: File | Blob,
  options: CompressionOptions,
  onProgress?: (progress: CompressionProgress) => void
): Promise<CompressionResult> {
  const startTime = performance.now();
  const originalSize = file.size;
  const { maxDimension = 1024, quality = 0.8 } = options;

  onProgress?.({ stage: 'loading', progress: 10 });

  // Create object URL and load image
  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = objectUrl;
    });

    onProgress?.({ stage: 'loading', progress: 30 });

    // Calculate dimensions
    let { width, height } = img;
    if (width > maxDimension || height > maxDimension) {
      if (width >= height) {
        height = Math.round((height / width) * maxDimension);
        width = maxDimension;
      } else {
        width = Math.round((width / height) * maxDimension);
        height = maxDimension;
      }
    }

    onProgress?.({ stage: 'resizing', progress: 50 });

    // Create canvas and draw
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');

    ctx.drawImage(img, 0, 0, width, height);

    onProgress?.({ stage: 'compressing', progress: 70 });

    // Convert to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
        'image/jpeg',
        quality
      );
    });

    onProgress?.({ stage: 'complete', progress: 100 });

    const duration = performance.now() - startTime;

    return {
      blob,
      width,
      height,
      size: blob.size,
      originalSize,
      ratio: blob.size / originalSize,
      duration,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Compress image using expo-image-manipulator (native platforms)
 */
async function compressWithExpo(
  uri: string,
  options: CompressionOptions,
  onProgress?: (progress: CompressionProgress) => void
): Promise<CompressionResult> {
  const startTime = performance.now();
  const { maxDimension = 1024, quality = 0.8 } = options;

  onProgress?.({ stage: 'loading', progress: 20 });

  // Dynamic import to avoid bundling on web
  const ImageManipulatorModule = await import('expo-image-manipulator');
  const FileSystem = await import('expo-file-system');
  const { Image } = await import('react-native');

  // Get original dimensions
  const { width: origWidth, height: origHeight } = await new Promise<{
    width: number;
    height: number;
  }>((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject
    );
  });

  // Get original file size
  let originalSize = 0;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    originalSize = (info as any).size ?? 0;
  } catch {
    originalSize = 0;
  }

  onProgress?.({ stage: 'resizing', progress: 50 });

  // Calculate resize action
  const largest = Math.max(origWidth, origHeight);
  type ActionType = { resize: { width: number } | { height: number } };
  const actions: ActionType[] = [];

  if (largest > maxDimension) {
    if (origWidth >= origHeight) {
      actions.push({ resize: { width: maxDimension } });
    } else {
      actions.push({ resize: { height: maxDimension } });
    }
  }

  onProgress?.({ stage: 'compressing', progress: 70 });

  // Perform manipulation
  const result = await ImageManipulatorModule.manipulateAsync(uri, actions, {
    compress: quality,
    format: ImageManipulatorModule.SaveFormat.JPEG,
  });

  // Get final file size
  let finalSize = 0;
  try {
    const info = await FileSystem.getInfoAsync(result.uri);
    finalSize = (info as any).size ?? 0;
  } catch {
    finalSize = 0;
  }

  onProgress?.({ stage: 'complete', progress: 100 });

  const duration = performance.now() - startTime;

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    size: finalSize,
    originalSize,
    ratio: originalSize > 0 ? finalSize / originalSize : 1,
    duration,
  };
}

/**
 * Main compression function - automatically selects best strategy
 */
export async function compressImage(
  input: File | Blob | string,
  options: CompressionOptions = {},
  onProgress?: (progress: CompressionProgress) => void
): Promise<CompressionResult> {
  // Native platforms: use expo-image-manipulator
  if (Platform.OS !== 'web') {
    if (typeof input === 'string') {
      return compressWithExpo(input, options, onProgress);
    }
    throw new Error('Native platforms require a URI string input');
  }

  // Web platform: prefer Worker, fallback to Canvas
  // Use duck typing to check for Blob-like objects (works with SSR and bundler limitations)
  const isBlob = typeof Blob !== 'undefined' && input instanceof Blob;
  const isFile = typeof File !== 'undefined' && input instanceof File;
  if (!isBlob && !isFile) {
    throw new Error('Web platform requires File or Blob input');
  }

  if (checkWebWorkerSupport()) {
    console.log('[CompressionService] Using Web Worker compression');
    return compressWithWorker(input, options, onProgress);
  }

  console.log('[CompressionService] Falling back to Canvas compression');
  return compressWithCanvas(input, options, onProgress);
}

/**
 * Convert URI to Blob (for web platform)
 */
export async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return response.blob();
}

/**
 * Convert Blob to base64 data URL
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Cleanup: terminate worker when no longer needed
 */
export function terminateWorker(): void {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
    workerCallbacks.clear();
  }
}
