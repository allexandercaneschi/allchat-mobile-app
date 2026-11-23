import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAppDispatch, useAppSelector } from '@/hooks';
import { settingsActions } from '@/store/settings/settingsActions';
import { selectPushToken } from '@/store/settings/settingsSelectors';
import { logout } from '@/store/auth/authSlice';
import { RecentSearches } from '@/screens/search/utils/recentSearches';

/** Ends the session: clears local caches, unregisters the push token and signs out. */
export const useLogout = () => {
  const dispatch = useAppDispatch();
  const pushToken = useAppSelector(selectPushToken);

  return useCallback(async () => {
    await AsyncStorage.removeItem('cwCookie');
    await RecentSearches.clearAll();
    await dispatch(settingsActions.removeDevice({ pushToken }));
    dispatch(logout());
  }, [dispatch, pushToken]);
};
