import { api } from './apiClient';
import { CurrentUserResponse, UserProfilePayload, UserProfileResponse } from '@/types';
import { clearJWT } from '@/utils/jwtStorage';
import { navigateToLogin } from '@/navigation/navigationService';

const getCurrentUser = async (): Promise<CurrentUserResponse> => {
  try {
    return await api.get<CurrentUserResponse>('/api/v1/me');
  } catch (error: any) {
    // If user is not found (404), it means the token is valid but user is gone (e.g. DB reset).
    // Treat this as a session expiry.
    if (error.status === 404) {
      console.warn('[userApi] User not found (404). Clearing session.');
      await clearJWT();
      navigateToLogin();
    }
    throw error;
  }
};

const getProfile = async (): Promise<UserProfileResponse> => {
  return await api.get<UserProfileResponse>('/api/v1/me/profile');
};

const upsertProfile = async (payload: UserProfilePayload): Promise<UserProfileResponse> => {
  return await api.put<UserProfileResponse>('/api/v1/me/profile', payload);
};

const deleteProfile = async (): Promise<void> => {
  await api.delete('/api/v1/me/profile');
};

const updateUsername = async (username: string): Promise<CurrentUserResponse> => {
  return await api.put<CurrentUserResponse>('/api/v1/me/username', { username });
};

const deleteAccount = async (): Promise<void> => {
  await api.delete('/api/v1/me');
};

export default {
  getCurrentUser,
  getProfile,
  upsertProfile,
  deleteProfile,
  updateUsername,
  deleteAccount,
};
