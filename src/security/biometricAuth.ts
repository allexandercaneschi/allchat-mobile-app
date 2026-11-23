import * as LocalAuthentication from 'expo-local-authentication';

import i18n from '@/i18n';

/**
 * Whether the device has a screen lock to authenticate against: a fingerprint,
 * a face, or a PIN/pattern/password. Without any of them there is nothing to
 * ask the user for.
 */
export const isDeviceSecured = async (): Promise<boolean> => {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
};

/**
 * Asks the system to authenticate the user. Biometrics are tried first and the
 * device PIN/pattern is the fallback, so a worn-out sensor does not lock the
 * technician out of the app.
 */
export const authenticateUser = async (promptMessage: string): Promise<boolean> => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: i18n.t('APP_LOCK.CANCEL'),
    });
    return result.success;
  } catch {
    return false;
  }
};
