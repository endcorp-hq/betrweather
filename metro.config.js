// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add polyfill resolvers
config.resolver.extraNodeModules.crypto = require.resolve('expo-crypto');
config.resolver.extraNodeModules.stream = require.resolve('stream-browserify');
config.resolver.extraNodeModules.path = require.resolve('path-browserify');
config.resolver.extraNodeModules.url = require.resolve('react-native-url-polyfill');
config.resolver.unstable_enablePackageExports = true;

module.exports = withNativeWind(config, { input: './global.css' })
