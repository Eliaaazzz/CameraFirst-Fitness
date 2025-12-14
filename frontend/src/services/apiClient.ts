/**
 * API Client for backend HTTP requests
 * Handles authentication, error handling, and request/response formatting
 */

import { API_BASE_URL, API_KEY } from '@env';
import { Platform } from 'react-native';
import { getJWT } from '../utils/jwtStorage';

// Ensure API Key is available (prioritize .env API_KEY, fallback to Expo environment variable)
const APP_API_KEY = API_KEY || process.env.EXPO_PUBLIC_API_KEY || '';

// Use the environment variable for all platforms
const normalizeBaseUrl = (url: string) => {
  if (!url) return 'http://localhost:8080';
  // strip trailing slashes
  let normalized = url.replace(/\/+$/, '');
  // drop trailing /api/v1 to avoid double-prefix when endpoints already include it
  normalized = normalized.replace(/\/api\/v1$/, '');
  return normalized || 'http://localhost:8080';
};

const BASE_URL = normalizeBaseUrl(API_BASE_URL);
const TIMEOUT = 30000; // 30 seconds

interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

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
    // This is the "Access Card" (门禁卡) - required for all endpoints
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-API-Key': APP_API_KEY,
      ...config.headers,
    };

    // If JWT token exists locally, include it (dual authentication)
    // This is the "ID Card" (身份证) - used for user session validation
    const jwtToken = await getJWT();
    if (jwtToken) {
      headers['Authorization'] = `Bearer ${jwtToken}`;
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
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      
      // Handle authentication failures (401/403)
      if (response.status === 401 || response.status === 403) {
        console.warn('[APIClient Auth Error]', {
          status: response.status,
          url,
          message: 'Authentication failed - JWT may be expired or invalid'
        });
        
        // Clear expired/invalid JWT and notify user
        // We'll import and call clearJWT here, but avoid circular navigation
        // Navigation will be handled by the root-level auth context
        const { clearJWT } = await import('@/utils/jwtStorage');
        await clearJWT();
        
        // Throw a specific error that can be caught by error boundaries
        throw new APIError(
          'Your session has expired. Please sign in again.',
          response.status,
          { ...errorData, authError: true }
        );
      }
      
      // Handle other errors
      console.log('[APIClient Error]', { status: response.status, data: errorData });
      throw new APIError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
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
