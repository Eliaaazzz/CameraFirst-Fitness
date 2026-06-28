/**
 * Jest configuration for the Expo / React Native frontend.
 *
 * The `jest-expo` preset is required so that React Native + Expo packages (which
 * ship untranspiled Flow/ESM) are transformed; without it every test that imports
 * `react-native` fails with "Cannot use import statement outside a module".
 */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/jest.setup.js',
  ],
  // jest-expo already transforms the RN/Expo module set; keep its defaults.
};
