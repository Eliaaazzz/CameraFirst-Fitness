/**
 * API Client for backend HTTP requests
 * Handles authentication, error handling, and request/response formatting
 */

import { API_BASE_URL, API_KEY } from '@env';
import { Platform } from 'react-native';
import { getJWT } from '../utils/jwtStorage';
import { navigateToLogin } from '../navigation/navigationService';

// Ensure API Key is available (prioritize .env API_KEY, fallback to Expo environment variable)
const APP_API_KEY = API_KEY || process.env.EXPO_PUBLIC_API_KEY || 'fitness-secret-key-123';

// Ensure API Base URL is available (prioritize .env, fallback to Expo env var, then production URL)
const RAW_API_BASE_URL = API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'https://aurafitness.org';

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
const TIMEOUT = 30000; // 30 seconds

console.log('[APIClient Init] Final BASE_URL:', BASE_URL);

interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

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

/**
 * Make an HTTP request with timeout and error handling
 */
async function request<T>(endpoint: string, config: RequestConfig = { method: 'GET' }): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeout || TIMEOUT);

  try {
    const url = `${BASE_URL}${endpoint}`;

    // CRITICAL: Always inject X-API-Key header in every request
    // This is the "Access Card"  - required for all endpoints
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-API-Key': APP_API_KEY,
      ...config.headers,
    };

    // If JWT token exists locally, include it (dual authentication)
    // This is the "ID Card"  - used for user session validation
    const jwtToken = await getJWT();
    console.log('[APIClient Request] JWT check - exists:', !!jwtToken, 'length:', jwtToken?.length);
    if (jwtToken) {
      headers['Authorization'] = `Bearer ${jwtToken}`;
      console.log('[APIClient Request] Authorization header added');
    } else {
      console.log('[APIClient Request] No JWT token found, proceeding with API key only');
    }

    // Add Content-Type for JSON requests
    if (config.body && !(config.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Debug logging - verify API Key is actually being sent
    console.log('[APIClient Request]', {
      method: config.method,
      url,
      hasApiKey: !!headers['X-API-Key'], // Should always be true
      hasToken: !!headers['Authorization'] // True after login
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
    });

    clearTimeout(timeout);

    // Log response status
    console.log('[APIClient Response]', {
      method: config.method,
      url,
      status: response.status,
      ok: response.ok,
    });

    if (!response.ok) {
      const rawError = await response.json().catch(() => ({ message: response.statusText }));
      const errorEnvelope = isApiEnvelope<any>(rawError) ? rawError : null;
      const message = errorEnvelope?.message || rawError?.message || `HTTP ${response.status}: ${response.statusText}`;
      const errors = errorEnvelope?.errors ?? rawError?.errors;

      // Handle authentication failures (401/403)
      if ((response.status === 401 || response.status === 403) && headers['Authorization']) {
        console.warn('[APIClient Auth Error] ⚠️ Authentication failed');
        console.warn('[APIClient Auth Error] Status:', response.status);
        console.warn('[APIClient Auth Error] URL:', url);
        console.warn('[APIClient Auth Error] Response:', rawError);
        console.warn('[APIClient Auth Error] This likely means JWT is invalid or expired');
        const { clearJWT } = await import('@/utils/jwtStorage');
        console.warn('[APIClient Auth Error] Clearing JWT from storage...');
        await clearJWT();
        
        // Navigate to login to prevent "Unable to load" screens
        navigateToLogin();

        throw new APIError(
          'Your session has expired. Please sign in again.',
          response.status,
          { ...rawError, message, errors, authError: true }
        );
      }

      console.log('[APIClient Error]', { status: response.status, data: rawError });
      throw new APIError(message, response.status, { ...rawError, errors });
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
export async function get<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: 'GET' });
}

/**
 * POST request
 */
export async function post<T>(endpoint: string, body?: any): Promise<T> {
  return request<T>(endpoint, { method: 'POST', body });
}

/**
 * PUT request
 */
export async function put<T>(endpoint: string, body?: any): Promise<T> {
  return request<T>(endpoint, { method: 'PUT', body });
}

/**
 * DELETE request
 */
export async function del<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: 'DELETE' });
}

/**
 * Upload image file
 */
export async function uploadImage<T>(
  endpoint: string,
  imageUri: string,
  metadata?: Record<string, any>
): Promise<T> {
  const formData = new FormData();

  // Platform-specific image handling
  if (Platform.OS === 'web') {
    // On web, convert data URI to Blob
    const response = await fetch(imageUri);
    const blob = await response.blob();
    formData.append('image', blob, 'image.jpg');
  } else {
    // On mobile, use native file upload
    const filename = imageUri.split('/').pop() || 'image.jpg';
    const type = 'image/jpeg';

    formData.append('image', {
      uri: imageUri,
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