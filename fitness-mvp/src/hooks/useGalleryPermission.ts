import { useEffect, useMemo } from 'react';
import { openAppSettings } from '@/utils';
import { PermissionResponse, useMediaLibraryPermissions } from 'expo-image-picker';

import { permissionStorage, PermissionStatus } from '@/services/storage';

export type GalleryPermissionState = PermissionStatus;

export const useGalleryPermission = () => {
  const [permission, request, get] = useMediaLibraryPermissions();

  useEffect(() => {
    if (permission?.status) {
      permissionStorage.gallery.save(permission.status as PermissionStatus).catch(() => undefined);
    }
  }, [permission?.status]);

  const openSettings = () => openAppSettings();

  const state: GalleryPermissionState = useMemo(() => {
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
