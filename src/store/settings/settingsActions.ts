import { createAsyncThunk } from '@reduxjs/toolkit';
import * as Sentry from '@sentry/react-native';

import { getMessaging, getToken } from '@react-native-firebase/messaging';
import {
  getSystemName,
  getManufacturer,
  getModel,
  getApiLevel,
  getBrand,
  getBuildNumber,
  getUniqueId,
} from 'react-native-device-info';

import { SettingsService } from './settingsService';
import type {
  NotificationSettings,
  NotificationSettingsPayload,
  PushPayload,
} from './settingsTypes';
import { handleApiError } from './settingsUtils';
import { isUnactionablePushError } from '@/utils/sentryUtils';

const createSettingsThunk = <TResponse, TPayload>(
  type: string,
  handler: (payload: TPayload) => Promise<TResponse>,
  errorMessage?: string,
) => {
  return createAsyncThunk<TResponse, TPayload>(type, async (payload, { rejectWithValue }) => {
    try {
      return await handler(payload);
    } catch (error) {
      return rejectWithValue(handleApiError(error, errorMessage));
    }
  });
};

export const settingsActions = {
  getNotificationSettings: createSettingsThunk<NotificationSettings, void>(
    'settings/getNotificationSettings',
    () => SettingsService.getNotificationSettings(),
  ),

  updateNotificationSettings: createSettingsThunk<
    NotificationSettings,
    NotificationSettingsPayload
  >('settings/updateNotificationSettings', SettingsService.updateNotificationSettings),

  getChatwootVersion: createSettingsThunk<{ version: string }, { installationUrl: string }>(
    'settings/getChatwootVersion',
    ({ installationUrl }) => SettingsService.getChatwootVersion(installationUrl),
  ),

  saveDeviceDetails: createAsyncThunk<{ fcmToken: string }, void>(
    'settings/saveDeviceDetails',
    async (_, { rejectWithValue }) => {
      try {
        const deviceId = await getUniqueId();
        const devicePlatform = getSystemName();
        const manufacturer = await getManufacturer();
        const model = await getModel();
        const apiLevel = await getApiLevel();
        const deviceName = `${manufacturer} ${model}`;

        const brandName = await getBrand();
        const buildNumber = await getBuildNumber();

        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        // https://github.com/invertase/react-native-firebase/issues/6893#issuecomment-1427998691
        // await messaging().registerDeviceForRemoteMessages();
        await sleep(1000);
        const fcmToken = await getToken(getMessaging());

        const pushData: PushPayload = {
          subscription_type: 'fcm',
          subscription_attributes: {
            deviceName,
            devicePlatform,
            apiLevel: apiLevel.toString(),
            brandName,
            buildNumber,
            push_token: fcmToken,
            device_id: deviceId,
          },
        };
        await SettingsService.saveDeviceDetails(pushData);
        return { fcmToken };
      } catch (error) {
        if (!isUnactionablePushError(error)) {
          Sentry.captureException(error);
        }
        return rejectWithValue(
          error instanceof Error ? error.message : 'Error saving device details',
        );
      }
    },
  ),

  removeDevice: createSettingsThunk<void, { pushToken: string }>(
    'settings/removeDevice',
    ({ pushToken }) => SettingsService.removeDevice({ push_token: pushToken }),
  ),
};
