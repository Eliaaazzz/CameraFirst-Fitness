import { API_BASE_URL } from '@env';
import { Platform } from 'react-native';

const FALLBACK_BASE_URL = 'https://aurafitness.org';
const SUCCESS_TTL_MS = 60_000;
const RETRY_DELAY_MS = 3_000;

function getDevFallbackBaseUrl(): string | null {
  if (!__DEV__) return null;

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080';
  }

  return 'http://localhost:8080';
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
}

const BASE_URL = normalizeBaseUrl(
  API_BASE_URL ||
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    getDevFallbackBaseUrl() ||
    FALLBACK_BASE_URL,
);

const WARMUP_URL = `${BASE_URL}/api/v1/auth/google/client-id`;

let lastWarmSuccessAt = 0;
let inFlightWarmup: Promise<Response | null> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

const performWarmupRequest = async (): Promise<Response | null> => {
  try {
    return await fetch(WARMUP_URL, { method: 'GET' });
  } catch {
    return null;
  }
};

export function startBackendWarmup(): Promise<Response | null> {
  const now = Date.now();
  if (lastWarmSuccessAt && now - lastWarmSuccessAt < SUCCESS_TTL_MS) {
    return Promise.resolve(null);
  }

  if (inFlightWarmup) {
    return inFlightWarmup;
  }

  inFlightWarmup = performWarmupRequest()
    .then((response) => {
      if (response?.ok) {
        lastWarmSuccessAt = Date.now();
        if (retryTimer) {
          clearTimeout(retryTimer);
          retryTimer = null;
        }
        return response;
      }

      if (!retryTimer) {
        retryTimer = setTimeout(() => {
          retryTimer = null;
          void startBackendWarmup();
        }, RETRY_DELAY_MS);
      }

      return response;
    })
    .finally(() => {
      inFlightWarmup = null;
    });

  return inFlightWarmup;
}
