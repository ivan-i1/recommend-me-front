module.exports = {
  preset: 'react-native',
  // The default react-native preset only transforms react-native itself, so the
  // ESM that @react-navigation and friends ship trips "Unexpected token 'export'".
  // Whitelist the RN-ecosystem packages App.tsx pulls in so the suite can run.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-safe-area-context|react-native-screens|react-native-shadow-2|react-native-svg)/)',
  ],
};
