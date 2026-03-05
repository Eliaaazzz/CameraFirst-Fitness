import { clearJWT } from '@/utils/jwtStorage';
import { QueryClient } from '@tanstack/react-query';

const isAuthError = (error: any) =>
  error?.status === 401 || error?.status === 403 || error?.authError;

// Global auth error handler
const handleAuthError = async (error: any) => {
  if (isAuthError(error)) {
    console.warn('[QueryClient] ⚠️ Authentication error detected');
    console.warn('[QueryClient] Error details:', { status: error?.status, authError: error?.authError });
    console.warn('[QueryClient] Clearing JWT and letting navigation handle redirect...');
    await clearJWT();
    // Let navigation naturally redirect to login instead of forcing reload
    // This prevents jarring user experience and allows proper cleanup
  }
};

const shouldRetryRequest = (failureCount: number, error: any) => {
  if (isAuthError(error)) {
    void handleAuthError(error);
    return false;
  }

  const status = error?.status;

  // 429/503 storms usually indicate rate-limiting or temporary backend outage.
  // Avoid automatic retries to prevent thundering herd behavior.
  if (status === 429 || status === 503) {
    return false;
  }

  if (typeof status === 'number') {
    // Never retry other client errors.
    if (status >= 400 && status < 500) {
      return false;
    }
    // Retry server-side errors only once.
    if (status >= 500) {
      return failureCount < 1;
    }
  }

  // Unknown/network errors: retry once.
  return failureCount < 1;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: shouldRetryRequest,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: shouldRetryRequest,
    },
  },
});
