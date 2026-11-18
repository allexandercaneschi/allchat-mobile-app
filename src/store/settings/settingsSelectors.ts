import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '@/store';
import { SERVER } from '@/config/server';

export const selectSettings = (state: RootState) => state.settings;

// The server is fixed at build time, so these do not read the store.
export const selectInstallationUrl = () => SERVER.installationUrl;

export const selectBaseUrl = () => SERVER.baseUrl;

export const selectWebSocketUrl = () => SERVER.webSocketUrl;

export const selectLocale = createSelector(selectSettings, settings =>
  settings.localeValue === 'zh' ? 'zh_CN' : settings.localeValue,
);

export const selectIsLocaleSet = createSelector(
  selectSettings,
  settings => settings.uiFlags.isLocaleSet,
);

export const selectNotificationSettings = createSelector(
  selectSettings,
  settings => settings.notificationSettings,
);

export const selectTheme = createSelector(selectSettings, settings => settings.theme);

export const selectChatwootVersion = createSelector(selectSettings, settings => settings.version);

export const selectPushToken = createSelector(selectSettings, settings => settings.pushToken);
