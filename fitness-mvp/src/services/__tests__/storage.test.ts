import AsyncStorage from '@react-native-async-storage/async-storage';

import { permissionStorage } from '@/services/storage';
import { preferenceStorage } from '@/services/storage';

describe('permissionStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('stores and retrieves camera permission status', async () => {
    await permissionStorage.camera.save('granted');
    await expect(permissionStorage.camera.read()).resolves.toBe('granted');
  });

  it('stores and retrieves gallery permission status', async () => {
    await permissionStorage.gallery.save('denied');
    await expect(permissionStorage.gallery.read()).resolves.toBe('denied');
  });

  it('returns null when nothing persisted', async () => {
    await expect(permissionStorage.camera.read()).resolves.toBeNull();
  });

  it('persists and reads last equipment selection', async () => {
    await preferenceStorage.equipment.save('dumbbells');
    await expect(preferenceStorage.equipment.read()).resolves.toBe('dumbbells');
  });
});
