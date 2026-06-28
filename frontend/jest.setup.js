/**
 * Global Jest setup for the frontend test suite.
 *
 * React Native native modules have no implementation under Jest, so the ones our
 * code imports at module load must be mocked here.
 */

// AsyncStorage ships an official Jest mock; without it any module that imports it
// throws "NativeModule: AsyncStorage is null" at require time.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
