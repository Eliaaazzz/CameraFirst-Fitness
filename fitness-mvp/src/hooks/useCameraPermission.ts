import { useEffect, useMemo } from 'react';
import { openAppSettings } from '@/utils';
import { useCameraPermissions, PermissionResponse } from 'expo-camera';

import { permissionStorage, PermissionStatus } from '@/services/storage';

export type CameraPermissionState = PermissionStatus;

export const useCameraPermission = () => {
  const [permission, request, get] = useCameraPermissions();

  useEffect(() => {
    if (permission?.status) {
      permissionStorage.camera.save(permission.status as PermissionStatus).catch(() => undefined);
    }
  }, [permission?.status]);

  const openSettings = () => openAppSettings();

  const state: CameraPermissionState = useMemo(() => {
    return (permission?.status as PermissionStatus) ?? 'undetermined';
  }, [permission?.status]);

  return {
    state,
    permission,
    request: async (): Promise<PermissionResponse> => request(),
    refresh: async (): Promise<PermissionResponse> => get(),
    openSettings,
  };
};
