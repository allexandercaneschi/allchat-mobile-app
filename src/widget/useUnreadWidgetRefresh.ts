import { useEffect } from 'react';
import { AppState } from 'react-native';
import { getMessaging, onMessage } from '@react-native-firebase/messaging';

import { useAppSelector } from '@/hooks';
import { selectLoggedIn } from '@/store/auth/authSelectors';

import { refreshUnreadWidget } from './refreshUnreadWidget';

/**
 * Keeps the home-screen widget in step with the app: when it is opened, when a push arrives
 * while it is in front, and when the agent signs in or out. Between those moments Android
 * redraws it on its own every 30 minutes.
 */
export const useUnreadWidgetRefresh = () => {
  const loggedIn = useAppSelector(selectLoggedIn);

  useEffect(() => {
    refreshUnreadWidget();
  }, [loggedIn]);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refreshUnreadWidget();
      }
    });
    const unsubscribeMessages = onMessage(getMessaging(), () => {
      refreshUnreadWidget();
    });
    return () => {
      appStateSubscription.remove();
      unsubscribeMessages();
    };
  }, []);
};
