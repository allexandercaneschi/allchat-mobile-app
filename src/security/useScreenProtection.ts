import { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';

const KEY = 'allchat';

/**
 * Hides the app from screenshots, screen recordings and the recent-apps preview
 * (Android's FLAG_SECURE), since the conversations hold customer data.
 */
export const useScreenProtection = () => {
  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync(KEY).catch(() => {
      // Not being able to protect the screen must not stop the app.
    });
    return () => {
      ScreenCapture.allowScreenCaptureAsync(KEY).catch(() => {});
    };
  }, []);
};
