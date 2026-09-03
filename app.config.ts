import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'OnMangeOu Client',
  slug: 'onmangeou',
  owner: 'manu99',
  extra: {
    eas: { projectId: 'b99b0cce-bdc3-4628-9513-2f4cb79fd65e' },
  },
  updates: {
    url: 'https://u.expo.dev/b99b0cce-bdc3-4628-9513-2f4cb79fd65e',
  },
  runtimeVersion: process.env.ONMANGEOU_NATIVE_RUNTIME === '1'
    ? { policy: 'fingerprint' }
    : { policy: 'sdkVersion' },
  version: '0.1.0',
  sdkVersion: '54.0.0',
  icon: './assets/images/icon.png',
  scheme: 'onmangeou',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'ci.onmangeou.client',
    icon: './assets/expo.icon',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
    config: { googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? '' } },
    adaptiveIcon: {
      backgroundColor: '#173B36',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    package: 'ci.onmangeou.client',
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-notifications',
    ['expo-image-picker', { photosPermission: 'Ajoutez une photo à votre avis sur le restaurant.', microphonePermission: false, cameraPermission: false }],
    'expo-router',
    ['expo-location', { locationWhenInUsePermission: 'Autoriser OnMangeOù à trouver les restaurants à proximité.' }],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F7F2E8',
        image: './assets/images/splash-icon.png',
        imageWidth: 120,
      },
    ],
    'expo-secure-store',
    'expo-font',
  ],
  experiments: {
    typedRoutes: false,
  },
};

export default config;
