import AsyncStorage from '@react-native-async-storage/async-storage';

const CAMERA_PERMISSION_KEY = 'fitness_mvp:camera_permission';
const GALLERY_PERMISSION_KEY = 'fitness_mvp:gallery_permission';
const LAST_EQUIPMENT_KEY = 'fitness_mvp:last_equipment_selection';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export const persistPermissionStatus = async (key: string, status: PermissionStatus) => {
  try {
    await AsyncStorage.setItem(key, status);
  } catch (error) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('Failed to persist permission status', error);
    }
  }
};

export const readPermissionStatus = async (key: string): Promise<PermissionStatus | null> => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value as PermissionStatus | null;
  } catch (error) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('Failed to read permission status', error);
    }
    return null;
  }
};

export const permissionStorage = {
  camera: {
    save: (status: PermissionStatus) => persistPermissionStatus(CAMERA_PERMISSION_KEY, status),
    read: () => readPermissionStatus(CAMERA_PERMISSION_KEY),
  },
  gallery: {
    save: (status: PermissionStatus) => persistPermissionStatus(GALLERY_PERMISSION_KEY, status),
    read: () => readPermissionStatus(GALLERY_PERMISSION_KEY),
  },
};

export type EquipmentSelection = 'bodyweight' | 'dumbbells' | 'mat';

export const preferenceStorage = {
  equipment: {
    save: async (choice: EquipmentSelection) => {
      try {
        await AsyncStorage.setItem(LAST_EQUIPMENT_KEY, choice);
      } catch (e) {
        if (__DEV__) console.warn('Failed to persist equipment selection', e);
      }
    },
    read: async (): Promise<EquipmentSelection | null> => {
      try {
        const v = await AsyncStorage.getItem(LAST_EQUIPMENT_KEY);
        return (v as EquipmentSelection) ?? null;
      } catch (e) {
        if (__DEV__) console.warn('Failed to read equipment selection', e);
        return null;
      }
    },
    clear: async () => {
      try {
        await AsyncStorage.removeItem(LAST_EQUIPMENT_KEY);
      } catch {}
    },
  },
};
