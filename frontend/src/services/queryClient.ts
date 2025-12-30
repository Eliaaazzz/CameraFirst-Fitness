import { clearJWT } from '@/utils/jwtStorage';
import { QueryClient } from '@tanstack/react-query';

// Global auth error handler
const handleAuthError = async (error: any) => {
  if (error?.status === 401 || error?.status === 403 || error?.authError) {
    console.warn('[QueryClient] ⚠️ Authentication error detected');
    console.warn('[QueryClient] Error details:', { status: error?.status, authError: error?.authError });
    console.warn('[QueryClient] Clearing JWT and letting navigation handle redirect...');
    await clearJWT();
    // Let navigation naturally redirect to login instead of forcing reload
    // This prevents jarring user experience and allows proper cleanup
  }
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors
        if (error?.status === 401 || error?.status === 403 || error?.authError) {
          handleAuthError(error);
          return false;
        }
        // Retry up to 2 times for network errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors
        if (error?.status === 401 || error?.status === 403 || error?.authError) {
          handleAuthError(error);
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});
