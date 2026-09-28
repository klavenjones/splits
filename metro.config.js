// Sentry's Expo config wraps Expo's default one: it adds debug IDs so uploaded source maps match
// release bundles. NativeWind wraps the result.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativewind } = require('nativewind/metro');

module.exports = withNativewind(getSentryExpoConfig(__dirname));
