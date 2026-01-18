/**
 * Image Compression Web Worker
 *
 * Off-main-thread image processing using OffscreenCanvas + createImageBitmap
 * This keeps the UI at 60fps while compressing 4K/10MB images
 *
 * Features:
 * - Zero main thread blocking
 * - Progressive compression for target size
 * - Maintains aspect ratio
 * - EXIF-aware orientation (via createImageBitmap)
 */

import type { CompressionOptions, WorkerMessageType, WorkerResponseType } from './types';

// Worker context type (simplified for compatibility)
declare const self: {
  onmessage: ((event: MessageEvent<WorkerMessageType>) => void) | null;
  postMessage: (message: WorkerResponseType, transfer?: Transferable[]) => void;
};

/**
 * Compress image using OffscreenCanvas
 * This is the core compression logic running off the main thread
 */
async function compressImage(
  imageData: ArrayBuffer,
  mimeType: string,
  options: CompressionOptions,
  sendProgress: (stage: string, progress: number) => void
): Promise<{ blob: Blob; width: number; height: number }> {
  const {
    maxDimension = 1024,
    quality = 0.8,
    format = 'image/jpeg',
    targetSize,
  } = options;

  sendProgress('loading', 10);

  // Create blob from ArrayBuffer
  const sourceBlob = new Blob([imageData], { type: mimeType });

  // Use createImageBitmap - handles EXIF orientation automatically
  // This is the recommended way to decode images in workers
  const imageBitmap = await createImageBitmap(sourceBlob);

  sendProgress('loading', 30);

  const { width: origWidth, height: origHeight } = imageBitmap;

  // Calculate new dimensions while maintaining aspect ratio
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

  // Create OffscreenCanvas for drawing
  const canvas = new OffscreenCanvas(newWidth, newHeight);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get 2D context from OffscreenCanvas');
  }

  // Draw the image (resized)
  ctx.drawImage(imageBitmap, 0, 0, newWidth, newHeight);

  // Clean up the ImageBitmap
  imageBitmap.close();

  sendProgress('compressing', 70);

  // Convert to blob with specified quality
  let resultBlob = await canvas.convertToBlob({
    type: format,
    quality,
  });

  // If target size specified, iteratively reduce quality
  if (targetSize && resultBlob.size > targetSize) {
    let currentQuality = quality;
    const minQuality = 0.3;
    const step = 0.1;

    while (resultBlob.size > targetSize && currentQuality > minQuality) {
      currentQuality -= step;
      resultBlob = await canvas.convertToBlob({
        type: format,
        quality: Math.max(currentQuality, minQuality),
      });

      sendProgress('compressing', 70 + Math.round((quality - currentQuality) / (quality - minQuality) * 20));
    }
  }

  sendProgress('complete', 100);

  return {
    blob: resultBlob,
    width: newWidth,
    height: newHeight,
  };
}

/**
 * Message handler for the worker
 */
self.onmessage = async (event: MessageEvent<WorkerMessageType>) => {
  const message = event.data;

  if (message.type === 'compress') {
    const { id, imageData, options, mimeType } = message;
    const startTime = performance.now();
    const originalSize = imageData.byteLength;

    const sendProgress = (stage: string, progress: number) => {
      const response: WorkerResponseType = {
        type: 'progress',
        id,
        progress: {
          stage: stage as any,
          progress,
        },
      };
      self.postMessage(response);
    };

    try {
      const { blob, width, height } = await compressImage(
        imageData,
        mimeType,
        options,
        sendProgress
      );

      // Convert blob to ArrayBuffer for transfer
      const resultBuffer = await blob.arrayBuffer();
      const duration = performance.now() - startTime;

      const response: WorkerResponseType = {
        type: 'success',
        id,
        result: {
          blob: resultBuffer,
          width,
          height,
          size: blob.size,
          originalSize,
          duration,
        },
      };

      // Transfer the ArrayBuffer (zero-copy)
      self.postMessage(response, [resultBuffer]);

    } catch (error) {
      const response: WorkerResponseType = {
        type: 'error',
        id,
        error: error instanceof Error ? error.message : 'Unknown compression error',
      };
      self.postMessage(response);
    }
  }

  if (message.type === 'cancel') {
    // Future: implement cancellation via AbortController
    console.log('[ImageWorker] Cancel requested for:', message.id);
  }
};

// Export empty object for module resolution
export {};
