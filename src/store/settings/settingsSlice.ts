import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { settingsActions } from './settingsActions';
import { NotificationSettings } from './settingsTypes';

interface SettingsState {
  uiFlags: {
    isUpdating: boolean;
    isLocaleSet: boolean;
  };
  notificationSettings: NotificationSettings;
  localeValue: string;
  biometricLockEnabled: boolean;
  version: string;
  pushToken: string;
}
const initialState: SettingsState = {
  uiFlags: {
    isUpdating: false,
    isLocaleSet: false,
  },
  localeValue: 'pt_BR',
  biometricLockEnabled: false,
  notificationSettings: {
    account_id: 0,
    all_email_flags: [],
    all_push_flags: [],
    id: 0,
    selected_email_flags: [],
    selected_push_flags: [],
    user_id: 0,
  },
  version: '',
  pushToken: '',
};
export const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    resetSettings: state => {
      state.uiFlags.isUpdating = false;
    },
    setBiometricLock: (state, action: PayloadAction<boolean>) => {
      state.biometricLockEnabled = action.payload;
    },
    setLocale: (state, action) => {
      state.localeValue = action.payload;
      state.uiFlags.isLocaleSet = true;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(settingsActions.getNotificationSettings.fulfilled, (state, action) => {
        state.notificationSettings = action.payload;
      })
      .addCase(settingsActions.updateNotificationSettings.pending, state => {
        state.uiFlags.isUpdating = true;
      })
      .addCase(settingsActions.updateNotificationSettings.fulfilled, (state, action) => {
        state.uiFlags.isUpdating = false;
        state.notificationSettings = action.payload;
      })
      .addCase(settingsActions.updateNotificationSettings.rejected, state => {
        state.uiFlags.isUpdating = false;
      })
      .addCase(settingsActions.getChatwootVersion.fulfilled, (state, action) => {
        const { version } = action.payload;
        state.version = version;
      })
      .addCase(settingsActions.saveDeviceDetails.fulfilled, (state, action) => {
        if (action?.payload?.fcmToken) {
          state.pushToken = action.payload.fcmToken;
        }
      })
      .addCase(settingsActions.saveDeviceDetails.rejected, (state, action) => {
        state.pushToken = '';
      });
  },
});
export const { resetSettings, setLocale, setBiometricLock } = settingsSlice.actions;
export default settingsSlice.reducer;
