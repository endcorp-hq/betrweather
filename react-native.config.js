module.exports = {
  assets: ['./assets/fonts/'],
  // Disable autolinking for transitive worklets package which is incompatible with RN 0.76
  dependencies: {
    'react-native-worklets': {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};