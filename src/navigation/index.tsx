import React, { useCallback, useRef } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import {
  getMessaging,
  getInitialNotification,
  onNotificationOpenedApp,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import { getStateFromPath } from '@react-navigation/native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { useTailwind } from '@/theme/useTailwind';
import { DefaultTheme, DarkTheme, NavigationContainer } from '@react-navigation/native';
import { AppTabs } from './tabs/AppTabs';
import i18n from 'i18n';
import { navigationRef } from '@/utils/navigationUtils';
import { findConversationLinkFromPush, findNotificationFromFCM } from '@/utils/pushUtils';
import { extractConversationIdFromUrl } from '@/utils/conversationUtils';
import { useAppSelector } from '@/hooks';
import { selectInstallationUrl, selectLocale } from '@/store/settings/settingsSelectors';
import { selectCurrentUserAccountId } from '@/store/auth/authSelectors';
import { resolveAccountSwitch, switchAccount } from '@/utils/accountUtils';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RefsProvider } from '@/context';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { transformNotification } from '@/utils/camelCaseKeys';
import { useAppDispatch } from '@/hooks';
import { APP_FONTS } from '@/theme/fonts';

setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
});

export const AppNavigationContainer = () => {
  const tailwind = useTailwind();
  const navigationTheme = tailwind.isDark ? DarkTheme : DefaultTheme;
  const [fontsLoaded] = useFonts(APP_FONTS);

  const routeNameRef = useRef<string | undefined>(undefined);
  const dispatch = useAppDispatch();

  const installationUrl = useAppSelector(selectInstallationUrl);
  const locale = useAppSelector(selectLocale);
  const currentAccountId = useAppSelector(selectCurrentUserAccountId);

  const linking = {
    prefixes: [installationUrl],
    config: {
      screens: {
        ChatScreen: {
          path: 'app/accounts/:accountId/conversations/:conversationId/:primaryActorId?/:primaryActorType?',
          parse: {
            accountId: (accountId: string) => parseInt(accountId),
            conversationId: (conversationId: string) => parseInt(conversationId),
            primaryActorId: (primaryActorId: string) => parseInt(primaryActorId),
            primaryActorType: (primaryActorType: string) => decodeURIComponent(primaryActorType),
          },
        },
      },
    },
    // getStateFromPath: App running, receives deep link - handles conversation navigation
    getStateFromPath: (path: string, config: Parameters<typeof getStateFromPath>[1]) => {
      let primaryActorId = null;
      let primaryActorType = null;
      let accountId = null;
      const state = getStateFromPath(path, config);
      const { routes } = state || {};

      const conversationId = extractConversationIdFromUrl({
        url: path,
      });

      if (!conversationId) {
        return;
      }

      if (routes && routes[0]) {
        const { params } = routes[0];
        primaryActorId = (params as { primaryActorId?: number })?.primaryActorId;
        primaryActorType = (params as { primaryActorType?: string })?.primaryActorType;
        accountId = (params as { accountId?: number })?.accountId;
      }

      const targetAccountId = resolveAccountSwitch(accountId);
      if (targetAccountId) switchAccount(dispatch, targetAccountId);

      return {
        routes: [
          {
            name: 'ChatScreen',
            params: {
              conversationId: conversationId,
              primaryActorId,
              primaryActorType,
            },
          },
        ],
      };
    },
    // getInitialURL: App starting up from deep link - handles push notifications
    async getInitialURL() {
      // Check if app was opened from a deep link
      const url = await Linking.getInitialURL();

      if (url != null) {
        return url;
      }

      // getInitialNotification: When the application is opened from a quit state.
      const message = await getInitialNotification(getMessaging());
      if (message) {
        const notification = findNotificationFromFCM({ message });
        if (notification) {
          const camelCaseNotification = transformNotification(notification);
          const conversationLink = findConversationLinkFromPush({
            notification: camelCaseNotification,
            installationUrl,
            currentAccountId,
          });
          if (conversationLink) {
            return conversationLink;
          }
        }
      }
      return undefined;
    },
    // subscribe: App backgrounded, receives deep link - handles push notifications
    subscribe(listener: (arg0: string) => void) {
      const onReceiveURL = ({ url }: { url: string }) => {
        listener(url);
      };

      // Listen to incoming links from deep linking
      const subscription = Linking.addEventListener('url', onReceiveURL);

      //onNotificationOpenedApp: When the application is running, but in the background.
      const unsubscribeNotification = onNotificationOpenedApp(getMessaging(), message => {
        if (message) {
          const notification = findNotificationFromFCM({ message });
          if (notification) {
            const camelCaseNotification = transformNotification(notification);

            const conversationLink = findConversationLinkFromPush({
              notification: camelCaseNotification,
              installationUrl,
              currentAccountId,
            });
            if (conversationLink) {
              listener(conversationLink);
            }
          }
        }
      });

      return () => {
        subscription.remove();
        unsubscribeNotification();
      };
    },
  };

  i18n.locale = locale;

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <NavigationContainer
      theme={{
        ...navigationTheme,
        colors: {
          ...navigationTheme.colors,
          background: tailwind.color('bg-white')!,
          card: tailwind.color('bg-white')!,
          text: tailwind.color('text-gray-950')!,
          border: tailwind.color('gray-200')!,
        },
      }}
      linking={linking}
      ref={navigationRef}
      onReady={() => {
        routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
      }}
      onStateChange={async () => {
        routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
      }}
      fallback={<ActivityIndicator animating />}>
      <View style={styles.navigationLayout} onLayout={onLayoutRootView}>
        <AppTabs />
      </View>
    </NavigationContainer>
  );
};
export const AppNavigator = () => {
  return (
    <GestureHandlerRootView style={styles.navigationLayout}>
      <KeyboardProvider>
        <RefsProvider>
          <SafeAreaProvider>
            <AppNavigationContainer />
          </SafeAreaProvider>
        </RefsProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  navigationLayout: {
    flex: 1,
  },
});
