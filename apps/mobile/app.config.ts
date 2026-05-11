import type { ExpoConfig, ConfigContext } from 'expo/config';

const IS_DEV = process.env['APP_VARIANT'] === 'development';
const BASE_PATH = process.env['EXPO_PUBLIC_BASE_PATH'] ?? '';

const getUniqueIdentifier = (): string => {
  if (IS_DEV) {
    return 'cloud.olsen.health.dev';
  }
  return 'cloud.olsen.health';
};

const getAppName = (): string => {
  if (IS_DEV) {
    return 'Health (Dev)';
  }
  return 'Health';
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: getAppName(),
  slug: 'health',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'health',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#000000',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: getUniqueIdentifier(),
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#000000',
    },
    package: getUniqueIdentifier(),
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    'expo-image',
    'expo-web-browser',
  ],
  updates: {
    url: 'https://u.expo.dev/REPLACE_WITH_PROJECT_ID',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  experiments: {
    typedRoutes: true,
    baseUrl: BASE_PATH,
  },
  extra: {
    router: {},
    eas: {
      projectId: 'REPLACE_WITH_PROJECT_ID',
    },
  },
});
