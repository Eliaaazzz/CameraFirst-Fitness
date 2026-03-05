import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/stores';
import userApi from '@/services/userApi';
import { CurrentUserResponse } from '@/types';

export const useCurrentUser = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isRestoringToken = useAuthStore((state) => state.isRestoringToken);
  const cachedUserInfo = useAuthStore((state) => state.userInfo);
  const hasUsableCachedUser = Boolean(cachedUserInfo?.userId?.trim());

  return useQuery<CurrentUserResponse, Error>({
    queryKey: ['current-user'],
    queryFn: userApi.getCurrentUser,
    enabled: isAuthenticated && !isRestoringToken,
    initialData: hasUsableCachedUser ? cachedUserInfo : undefined,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error: any) => {
      const status = error?.status;

      if (status === 401 || status === 403 || status === 404) {
        return false;
      }
      if (status === 429 || status === 503) {
        return false;
      }
      if (typeof status === 'number' && status >= 400 && status < 500) {
        return false;
      }

      // Unknown/network/server errors: only retry once.
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
  });
};

export default useCurrentUser;
