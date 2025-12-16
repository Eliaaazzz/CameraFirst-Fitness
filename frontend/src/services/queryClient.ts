import { clearJWT } from '@/utils/jwtStorage';
import { QueryClient } from '@tanstack/react-query';

// Global auth error handler
const handleAuthError = async (error: any) => {
  if (error?.status === 401 || error?.status === 403 || error?.authError) {
    console.warn('[QueryClient] Authentication error detected, clearing JWT');
    await clearJWT();
    // The SplashScreen will handle redirect on next app check
    // For immediate effect, we'll reload the app
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
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
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors
        if (error?.status === 401 || error?.status === 403 || error?.authError) {
          handleAuthError(error);
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});
