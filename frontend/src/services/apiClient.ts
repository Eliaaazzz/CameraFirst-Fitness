/**
 * API Client for backend HTTP requests
 * Handles authentication, error handling, and request/response formatting
 */

import { API_BASE_URL, API_KEY } from '@env';
import { Platform } from 'react-native';

// Use the environment variable for all platforms
const getBaseURL = () => {
  // Always use the environment variable
  return API_BASE_URL || 'http://localhost:8080';
};

const BASE_URL = getBaseURL();
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
    formData.append('file', blob, 'image.jpg');
  } else {
    // On mobile, use native file upload
    const filename = imageUri.split('/').pop() || 'image.jpg';
    const type = 'image/jpeg';

    formData.append('file', {
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
