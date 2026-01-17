/**
 * Image Compression Types
 * Shared types for the high-performance image compression system
 */

export interface CompressionOptions {
  /** Maximum width/height in pixels (default: 1024) */
  maxDimension?: number;
  /** JPEG quality 0-1 (default: 0.8) */
  quality?: number;
  /** Target file size in bytes (optional, will iteratively compress) */
  targetSize?: number;
  /** Output format (default: 'image/jpeg') */
  format?: 'image/jpeg' | 'image/webp' | 'image/png';
}

export interface CompressionResult {
  /** Compressed image as Blob (web) or URI string (native) */
  blob?: Blob;
  uri?: string;
  /** Final dimensions */
  width: number;
  height: number;
  /** Final file size in bytes */
  size: number;
  /** Original file size in bytes */
  originalSize: number;
  /** Compression ratio (0-1, lower = more compressed) */
  ratio: number;
  /** Time taken in milliseconds */
  duration: number;
}

export interface CompressionProgress {
  stage: 'loading' | 'resizing' | 'compressing' | 'complete' | 'error';
  progress: number; // 0-100
  message?: string;
}

/** Worker message types */
export type WorkerMessageType =
  | { type: 'compress'; id: string; imageData: ArrayBuffer; options: CompressionOptions; mimeType: string }
  | { type: 'cancel'; id: string };

export type WorkerResponseType =
  | { type: 'progress'; id: string; progress: CompressionProgress }
  | { type: 'success'; id: string; result: { blob: ArrayBuffer; width: number; height: number; size: number; originalSize: number; duration: number } }
  | { type: 'error'; id: string; error: string };
