import { Linking, Platform } from 'react-native';

export const openAppSettings = async () => {
  try {
    await Linking.openSettings();
  } catch (e) {
    if (__DEV__) console.warn('Failed to open app settings', e);
    // Fallback: try platform-specific URLs if necessary in future
    if (Platform.OS === 'ios') {
      // no-op, iOS Linking.openSettings is the supported path
    }
  }
};

