/**
 * API Client for backend HTTP requests
 * Handles authentication, error handling, and request/response formatting
 */

import { API_BASE_URL, API_KEY } from '@env';
import { Platform } from 'react-native';

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

// Log configuration on startup
if (typeof console !== 'undefined') {
  console.log('[APIClient Config]', {
    API_BASE_URL,
    BASE_URL,
    normalized: `Strips trailing slashes and /api/v1 suffix`,
  });
}

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

    // Log for debugging
    console.log('[APIClient]', {
      BASE_URL,
      endpoint,
      finalURL: url,
      method: config.method,
    });

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-API-Key': API_KEY || '',
      ...config.headers,
    };

    // Add Content-Type for JSON requests
    if (config.body && !(config.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

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
