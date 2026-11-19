import { ConfigContext, ExpoConfig } from 'expo/config';
import { load as loadEnv } from '@expo/env';

// This file is compiled on its own by the Expo tooling, so it cannot import from
// src/. The full validation of the URL lives in src/config/server.ts; here only the
// host is needed, for the conversation links.
// Some commands (expo export, for one) read this file before loading the .env files,
// so they are loaded here too. Variables already set in the shell are kept.
const getServerUrl = (): URL => {
  loadEnv(__dirname, { silent: true });
  try {
    return new URL(process.env.EXPO_PUBLIC_INSTALLATION_URL ?? '');
  } catch {
    throw new Error('EXPO_PUBLIC_INSTALLATION_URL não está definida ou é inválida.');
  }
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const serverUrl = getServerUrl();
  return {
    name: 'ALLChat',
    slug: 'allchat',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    platforms: ['android'],
    scheme: 'allchat',
    android: {
      adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#111113' },
      package: 'br.com.alltecnologias.allchat',
      versionCode: 1,
      permissions: [
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.POST_NOTIFICATIONS',
      ],
      // Please use the relative path to the google-services.json file
      googleServicesFile: process.env.EXPO_PUBLIC_ANDROID_GOOGLE_SERVICES_FILE,
      // Links to conversations on the ALLChat server open the app. The server
      // does not publish an assetlinks.json for this app, so the link is not
      // auto-verified and Android may ask which app to use.
      intentFilters: [
        {
          action: 'VIEW',
          data: [
            {
              scheme: serverUrl.protocol.replace(':', ''),
              host: serverUrl.hostname,
              pathPrefix: '/app/accounts/',
              pathPattern: '/*/conversations/*',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    extra: {
      eas: {
        storybookEnabled: process.env.EXPO_STORYBOOK_ENABLED,
      },
    },
    plugins: [
      'expo-font',
      'expo-image',
      'expo-status-bar',
      [
        'expo-splash-screen',
        {
          image: './assets/splash.png',
          resizeMode: 'contain',
          backgroundColor: '#111113',
          enableFullScreenImage_legacy: true,
        },
      ],
      ['react-native-permissions', {}],
      [
        '@sentry/react-native',
        {
          url: 'https://sentry.io/',
          project: process.env.EXPO_PUBLIC_SENTRY_PROJECT_NAME,
          organization: process.env.EXPO_PUBLIC_SENTRY_ORG_NAME,
        },
      ],
      'expo-web-browser',
      'expo-local-authentication',
      '@react-native-community/datetimepicker',
      '@react-native-firebase/app',
      '@react-native-firebase/messaging',
      [
        'expo-build-properties',
        {
          // compileSdk/targetSdk 36 = Expo SDK 54 / RN 0.81 default (Android 16).
          // notifee (issue #808) needs compileSdk >= 35, satisfied by 36.
          android: {
            minSdkVersion: 24,
            compileSdkVersion: 36,
            targetSdkVersion: 36,
            enableProguardInReleaseBuilds: true,
          },
        },
      ],
      './with-android-notification-channel.js',
    ],
  };
};
