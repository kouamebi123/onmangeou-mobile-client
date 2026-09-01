import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'OnMangeOu Client',
  slug: 'onmangeou',
  owner: 'manu99',
  extra: {
    eas: { projectId: 'b99b0cce-bdc3-4628-9513-2f4cb79fd65e' },
  },
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'onmangeou',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'ci.onmangeou.client',
    icon: './assets/expo.icon',
  },
  android: {
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
    'expo-image',
  ],
  experiments: {
    typedRoutes: false,
  },
};

export default config;
