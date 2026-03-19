/**
 * API Client for backend HTTP requests
 * Handles authentication, error handling, and request/response formatting
 */

import { API_BASE_URL, API_KEY } from '@env';
import { Platform } from 'react-native';

// Ensure API Key is available (prioritize .env API_KEY, fallback to Expo environment variable)
const APP_API_KEY = API_KEY || process.env.EXPO_PUBLIC_API_KEY || 'fitness-secret-key-123';

function getDevFallbackBaseUrl(): string | null {
  if (!__DEV__) return null;

  // Android emulator can't reach host via localhost.
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080';
  }

  // iOS simulator + web dev can use localhost.
  return 'http://localhost:8080';
}

// Ensure API Base URL is available (prioritize .env, fallback to Expo env var, then production URL)
const RAW_API_BASE_URL =
  API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  getDevFallbackBaseUrl() ||
  'https://aurafitness.org';

// Log configuration at init for debugging
console.log('[APIClient Init]', {
  platform: Platform.OS,
  apiKey: APP_API_KEY ? `${APP_API_KEY.substring(0, 10)}...` : 'MISSING',
  rawBaseUrl: RAW_API_BASE_URL,
});

// Use the environment variable for all platforms
const normalizeBaseUrl = (url: string) => {
  if (!url) return 'https://aurafitness.org';
  // strip trailing slashes
  let normalized = url.replace(/\/+$/, '');
  // drop trailing /api/v1 to avoid double-prefix when endpoints already include it
  normalized = normalized.replace(/\/api\/v1$/, '');
  return normalized || 'https://aurafitness.org';
};

const BASE_URL = normalizeBaseUrl(RAW_API_BASE_URL);
const TIMEOUT = 30000; // 30 seconds default
const UPLOAD_TIMEOUT = 45000; // Fail faster for interactive AI flows instead of hanging for 90s

console.log('[APIClient Init] Final BASE_URL:', BASE_URL);

// On web, blobs can occasionally lose their MIME type (e.g., blob: URLs, some browsers, or
// certain compression paths). If the backend relies on `Content-Type` for validation or the
// upstream AI model relies on `mime_type` for decoding, sending a generic/empty type can cause
// hard-to-debug failures.
async function detectImageMimeType(blob: Blob): Promise<string | null> {
  try {
    const headerSize = Math.min(16, blob.size);
    const buffer = await blob.slice(0, headerSize).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const startsWith = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);

    // JPEG: FF D8 FF
    if (bytes.length >= 3 && startsWith(0xff, 0xd8, 0xff)) return 'image/jpeg';
    // PNG: 89 50 4E 47
    if (bytes.length >= 4 && startsWith(0x89, 0x50, 0x4e, 0x47)) return 'image/png';
    // GIF: 47 49 46 38
    if (bytes.length >= 4 && startsWith(0x47, 0x49, 0x46, 0x38)) return 'image/gif';
    // WebP: RIFF....WEBP
    if (
      bytes.length >= 12 &&
      startsWith(0x52, 0x49, 0x46, 0x46) &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return 'image/webp';
    }

    return null;
  } catch {
    return null;
  }
}

function normalizeMimeType(type: string | undefined | null): string {
  if (!type) return '';
  // Strip charset or other params (e.g. "image/jpeg; charset=binary")
  const base = type.split(';')[0]?.trim().toLowerCase();
  if (base === 'image/jpg') return 'image/jpeg';
  return base;
}

function filenameForMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'image/png':
      return 'image.png';
    case 'image/gif':
      return 'image.gif';
    case 'image/webp':
      return 'image.webp';
    case 'image/jpeg':
    default:
      return 'image.jpg';
  }
}

const SUPPORTED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

function isSupportedUploadMimeType(type: string | undefined | null): boolean {
  return SUPPORTED_UPLOAD_MIME_TYPES.has(normalizeMimeType(type));
}

function inferMimeTypeFromUri(uri: string): string {
  if (!uri) return '';
  const normalizedUri = uri.split('?')[0].split('#')[0].toLowerCase();

  if (normalizedUri.endsWith('.jpg') || normalizedUri.endsWith('.jpeg')) return 'image/jpeg';
  if (normalizedUri.endsWith('.png')) return 'image/png';
  if (normalizedUri.endsWith('.gif')) return 'image/gif';
  if (normalizedUri.endsWith('.webp')) return 'image/webp';
  if (normalizedUri.endsWith('.heic')) return 'image/heic';
  if (normalizedUri.endsWith('.heif')) return 'image/heif';

  return '';
}

function dataUriToBlob(dataUri: string): Blob {
  const match = dataUri.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,(.*)$/i);
  if (!match) {
    throw new Error('Invalid data URI');
  }

  const mimeType = normalizeMimeType(match[1] || 'application/octet-stream') || 'application/octet-stream';
  const isBase64 = Boolean(match[2]);
  const dataPart = match[3] || '';

  if (isBase64) {
    const binary = atob(dataPart);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  }

  return new Blob([decodeURIComponent(dataPart)], { type: mimeType });
}

async function readWebImageBlob(imageUri: string): Promise<Blob> {
  if (imageUri.startsWith('data:')) {
    return dataUriToBlob(imageUri);
  }

  const response = await fetch(imageUri);
  if (!response.ok) {
    throw new Error(`Failed to read image URI (HTTP ${response.status})`);
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    throw new Error('Image blob is empty');
  }

  return blob;
}

async function convertBlobToJpegOnWeb(blob: Blob, quality = 0.9): Promise<Blob | null> {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return null;
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.src = objectUrl;
    });

    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) {
      throw new Error('Decoded image has invalid dimensions');
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context is unavailable');
    }

    context.drawImage(image, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (output) => (output ? resolve(output) : reject(new Error('Canvas toBlob returned null'))),
        'image/jpeg',
        quality
      );
    });
  } catch (error) {
    console.warn('[APIClient] Failed to convert image blob to JPEG:', error);
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

/** Options for GET/DELETE requests - cannot override method or body */
type GetDeleteOptions = Omit<RequestConfig, 'method' | 'body'>;

/** Options for POST/PUT requests - cannot override method or body */
type PostPutOptions = Omit<RequestConfig, 'method' | 'body'>;

type UploadImageOptions = {
  /**
   * Skip mobile-side compression when the caller already pre-processed
   * the image (for example in ReviewMealScreen).
   */
  skipMobileCompression?: boolean;
};

type ApiEnvelope<T> = {
  success: boolean;
  code?: number;
  message?: string;
  data?: T;
  errors?: any;
  path?: string;
  timestamp?: number;
};

const isApiEnvelope = <T>(value: any): value is ApiEnvelope<T> => {
  return value && typeof value === 'object' && 'success' in value;
};

class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

function parseRetryAfterMs(retryAfterHeader: string | null): number | undefined {
  if (!retryAfterHeader) return undefined;

  const asSeconds = Number.parseInt(retryAfterHeader, 10);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return asSeconds * 1000;
  }

  const asDate = Date.parse(retryAfterHeader);
  if (Number.isNaN(asDate)) return undefined;

  const deltaMs = asDate - Date.now();
  return deltaMs > 0 ? deltaMs : undefined;
}

/**
 * Make an HTTP request with timeout and error handling.
 * On web: Uses credentials: 'include' to send HttpOnly cookies.
 * On mobile: Uses Authorization header with Bearer token.
 */
async function request<T>(endpoint: string, config: RequestConfig = { method: 'GET' }): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeout || TIMEOUT);
  const isWebPlatform = Platform.OS === 'web';

  try {
    const url = `${BASE_URL}${endpoint}`;

    // CRITICAL: Always inject X-API-Key header in every request
    // This is the "Access Card"  - required for all endpoints
    // Also include user's timezone for accurate date calculations (e.g., streak)
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-API-Key': APP_API_KEY,
      'X-User-Timezone': userTimezone,
      ...config.headers,
    };

    // Mobile only: Add Authorization header with Bearer token from Zustand store
    // Web: JWT is in HttpOnly cookie, sent automatically with credentials: 'include'
    if (!isWebPlatform) {
      // Use dynamic imports to avoid circular dependency and recover from cold-start
      // races where SecureStore has the token but Zustand memory has not been hydrated yet.
      const [{ getAuthState, useAuthStore }, { getJWT }] = await Promise.all([
        import('../stores/useAuthStore'),
        import('../utils/jwtStorage'),
      ]);
      const inMemoryToken = getAuthState().userToken;
      const token = inMemoryToken || await getJWT();
      console.log('[APIClient Request] Mobile JWT check - exists:', !!token, 'length:', token?.length);
      if (token) {
        if (!inMemoryToken) {
          useAuthStore.setState({ userToken: token });
          console.log('[APIClient Request] Mobile: Rehydrated JWT from secure storage');
        }
        headers['Authorization'] = `Bearer ${token}`;
        console.log('[APIClient Request] Mobile: Authorization header added');
      } else {
        console.log('[APIClient Request] Mobile: No JWT token found, proceeding with API key only');
      }
    } else {
      console.log('[APIClient Request] Web: Using HttpOnly cookie (credentials: include)');
    }

    // Add Content-Type for JSON requests
    if (config.body && !(config.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Debug logging - verify API Key is actually being sent
    console.log('[APIClient Request]', {
      method: config.method,
      url,
      platform: Platform.OS,
      hasApiKey: !!headers['X-API-Key'], // Should always be true
      hasToken: !!headers['Authorization'], // True after login (mobile only)
      usingCookies: isWebPlatform // Web uses HttpOnly cookies
    });

    const response = await fetch(url, {
      method: config.method,
      headers,
      body: config.body instanceof FormData
        ? config.body
        : config.body
        ? JSON.stringify(config.body)
        : undefined,
      signal: controller.signal,
      // SECURITY: On web, include cookies for HttpOnly JWT authentication
      credentials: isWebPlatform ? 'include' : 'omit',
    });

    clearTimeout(timeout);

    // Log response status
    console.log('[APIClient Response]', {
      method: config.method,
      url,
      status: response.status,
      ok: response.ok,
    });

    // If backend signals that our JWT is stale, clear it from storage so future
    // requests don't keep sending an expired token.  The current request still
    // succeeds (backend falls back to API key auth for endpoints that don't need
    // user identity).  User-specific endpoints will return 401 in the body, which
    // is handled below.
    if (!isWebPlatform && response.headers.get('X-JWT-Status') === 'expired') {
      console.warn('[APIClient] JWT expired — clearing stale token from storage');
      try {
        const [{ useAuthStore }, { clearJWT }] = await Promise.all([
          import('../stores/useAuthStore'),
          import('../utils/jwtStorage'),
        ]);
        useAuthStore.setState({ userToken: null });
        await clearJWT();
      } catch (cleanupErr) {
        console.warn('[APIClient] Failed to clear stale JWT:', cleanupErr);
      }
    }

    if (!response.ok) {
      const rawError = await response.json().catch(() => ({ message: response.statusText }));
      const errorEnvelope = isApiEnvelope<any>(rawError) ? rawError : null;
      const message = errorEnvelope?.message || rawError?.message || `HTTP ${response.status}: ${response.statusText}`;
      const errors = errorEnvelope?.errors ?? rawError?.errors;
      const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));

      let normalizedMessage = message;
      if (response.status === 429) {
        const retryHint = retryAfterMs
          ? ` Please retry in about ${Math.ceil(retryAfterMs / 1000)}s.`
          : '';
        normalizedMessage = `Too many requests.${retryHint}`;
      } else if (response.status === 503) {
        normalizedMessage = 'Service temporarily unavailable. Please try again shortly.';
      }

      // Handle authentication failures (401/403)
      // On web: We're using HttpOnly cookies, so check if we're authenticated (have stored email)
      // On mobile: Check if we had an Authorization header
      const wasAuthenticated = isWebPlatform
        ? !!localStorage.getItem('aura_user_email')  // Web: check if logged in
        : !!headers['Authorization'];                 // Mobile: check for token

      if ((response.status === 401 || response.status === 403) && wasAuthenticated) {
        console.warn('[APIClient Auth Error] ⚠️ Authentication failed');
        console.warn('[APIClient Auth Error] Status:', response.status);
        console.warn('[APIClient Auth Error] URL:', url);
        console.warn('[APIClient Auth Error] Platform:', Platform.OS);
        console.warn('[APIClient Auth Error] Response:', rawError);
        console.warn('[APIClient Auth Error] This likely means JWT is invalid or expired');

        // Use Zustand store signOut to handle cleanup and navigation
        const { getAuthState } = await import('../stores/useAuthStore');
        console.warn('[APIClient Auth Error] Triggering signOut via Zustand store...');
        await getAuthState().signOut();

        throw new APIError(
          'Your session has expired. Please sign in again.',
          response.status,
          { ...rawError, message: normalizedMessage, errors, authError: true, retryAfterMs }
        );
      }

      console.log('[APIClient Error]', { status: response.status, data: rawError });
      throw new APIError(normalizedMessage, response.status, { ...rawError, errors, retryAfterMs });
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const parsed = await response.json();

      // Unwrap ApiEnvelope when present; otherwise return raw
      if (isApiEnvelope<T>(parsed)) {
        if (parsed.success) {
          return (parsed.data as T) ?? (parsed as unknown as T);
        }
        // success=false but HTTP 200: surface as APIError to callers
        throw new APIError(parsed.message || 'Request failed', parsed.code, parsed);
      }

      return parsed as T;
    }

    return null as T;
  } catch (error: any) {
    clearTimeout(timeout);

    if (error.name === 'AbortError') {
      throw new APIError('Request timeout', 408);
    }

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError(
      error.message || 'Network request failed',
      undefined,
      error
    );
  }
}

/**
 * GET request
 */
export async function get<T>(endpoint: string, options?: GetDeleteOptions): Promise<T> {
  return request<T>(endpoint, { method: 'GET', ...options });
}

/**
 * POST request
 */
export async function post<T>(endpoint: string, body?: any, options?: PostPutOptions): Promise<T> {
  return request<T>(endpoint, { method: 'POST', body, ...options });
}

/**
 * PUT request
 */
export async function put<T>(endpoint: string, body?: any, options?: PostPutOptions): Promise<T> {
  return request<T>(endpoint, { method: 'PUT', body, ...options });
}

/**
 * DELETE request
 */
export async function del<T>(endpoint: string, options?: GetDeleteOptions): Promise<T> {
  return request<T>(endpoint, { method: 'DELETE', ...options });
}

/**
 * Upload image file
 *
 * IMPORTANT: On iOS, photos may be in HEIC format which Java ImageIO cannot read.
 * This function automatically converts HEIC to JPEG before uploading.
 */
export async function uploadImage<T>(
  endpoint: string,
  imageUri: string,
  metadata?: Record<string, any>,
  options?: UploadImageOptions
): Promise<T> {
  const formData = new FormData();

  // Platform-specific image handling
  if (Platform.OS === 'web') {
    let blob: Blob;
    try {
      blob = await readWebImageBlob(imageUri);
    } catch (error: any) {
      throw new APIError(
        'Unable to read selected image. Please choose the image again.',
        400,
        error
      );
    }

    let mimeType = normalizeMimeType(blob.type);
    const detectedType = await detectImageMimeType(blob);

    // Prefer detected signature when browser did not provide a concrete image MIME.
    if ((!mimeType || mimeType === 'application/octet-stream') && detectedType) {
      mimeType = detectedType;
      blob = new Blob([blob], { type: mimeType });
      console.log('[APIClient] Web image MIME detected from bytes:', mimeType);
    }

    // Fix mismatched browser metadata if signature is recognized and supported.
    if (!isSupportedUploadMimeType(mimeType) && isSupportedUploadMimeType(detectedType)) {
      mimeType = normalizeMimeType(detectedType);
      blob = new Blob([blob], { type: mimeType });
      console.warn('[APIClient] Corrected web image MIME using magic bytes:', mimeType);
    }

    // Last resort for unsupported/unknown browser types (e.g., image/heic):
    // decode and transcode to JPEG in-browser so backend + Gemini accept it.
    if (!isSupportedUploadMimeType(mimeType)) {
      const converted = await convertBlobToJpegOnWeb(blob);
      if (converted) {
        blob = converted;
        mimeType = 'image/jpeg';
        console.log('[APIClient] Converted unsupported web image to JPEG before upload');
      }
    }

    if (!isSupportedUploadMimeType(mimeType)) {
      throw new APIError(
        `Unsupported image format${mimeType ? `: ${mimeType}` : ''}. Please use JPG, PNG, GIF, or WebP.`,
        400
      );
    }

    if (blob.size === 0) {
      throw new APIError('Selected image is empty. Please choose another image.', 400);
    }

    formData.append('image', blob, filenameForMimeType(mimeType));
  } else {
    // On mobile (iOS/Android), skip compression only when URI clearly points to a
    // backend-supported format. Unknown/HEIC URIs must be converted to JPEG.
    const inferredMimeType = inferMimeTypeFromUri(imageUri);
    const skipCompressionSafely =
      Boolean(options?.skipMobileCompression) && isSupportedUploadMimeType(inferredMimeType);

    let processedUri = imageUri;
    let finalMimeType = skipCompressionSafely
      ? normalizeMimeType(inferredMimeType)
      : 'image/jpeg';

    if (!skipCompressionSafely) {
      if (options?.skipMobileCompression) {
        console.warn(
          '[APIClient] skipMobileCompression requested but URI is not a confirmed supported image type; forcing JPEG conversion',
          { inferredMimeType: inferredMimeType || 'unknown' }
        );
      }
      try {
        // Dynamic import to avoid bundling on web
        const { compressImage } = await import('../utils/imageHelpers');

        // compressImage uses ImageManipulator with SaveFormat.JPEG
        // This converts HEIC → JPEG and also compresses for faster upload
        const result = await compressImage(imageUri, {
          maxDimension: 1024,
          quality: 0.78
        });
        processedUri = result.uri;
        finalMimeType = 'image/jpeg';

        console.log('[APIClient] Image converted to JPEG:', {
          original: imageUri.slice(-30),
          processed: processedUri.slice(-30),
          size: `${Math.round(result.size / 1024)}KB`
        });
      } catch (error) {
        if (!isSupportedUploadMimeType(inferredMimeType)) {
          throw new APIError(
            'Unable to prepare image for upload. Please choose a JPG/PNG image or retake the photo.',
            400,
            error
          );
        }

        // Fallback to original URI only when it is already in a supported format.
        finalMimeType = normalizeMimeType(inferredMimeType);
        console.warn('[APIClient] JPEG conversion failed, uploading original supported format:', error);
      }
    } else {
      console.log('[APIClient] Skipping extra mobile compression for preprocessed image');
    }

    const type = normalizeMimeType(finalMimeType) || 'image/jpeg';
    const filename = filenameForMimeType(type);

    formData.append('image', {
      uri: processedUri,
      name: filename,
      type,
    } as any);
  }

  // Add metadata if provided
  if (metadata) {
    formData.append('metadata', JSON.stringify(metadata));
  }

  return request<T>(endpoint, {
    method: 'POST',
    body: formData,
    timeout: UPLOAD_TIMEOUT, // Use longer timeout for AI image analysis
  });
}

export const api = {
  get,
  post,
  put,
  delete: del,
  uploadImage,
};

export { APIError };
