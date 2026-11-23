import React, { PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Image, Modal, Text, View } from 'react-native';

import { Button } from '@/components-next/button';
import i18n from '@/i18n';
import { useAppSelector } from '@/hooks';
import { useLogout } from '@/hooks/useLogout';
import { authenticateUser, isDeviceSecured } from '@/security/biometricAuth';
import { shouldLockOnReturn } from '@/security/appLock';
import { selectLoggedIn } from '@/store/auth/authSelectors';
import { selectBiometricLockEnabled } from '@/store/settings/settingsSelectors';
import { useTailwind } from '@/theme/useTailwind';

/**
 * Asks for the user's biometrics (or the device PIN) when the app opens and when
 * it comes back after a while in the background, if the option is on.
 *
 * The lock is a native modal, so it also covers the bottom sheets and pickers,
 * which are windows of their own. It does nothing when nobody is signed in, and
 * when the device has no screen lock at all, since there would be nothing to
 * authenticate against and the user would be shut out of the app.
 */
export const AppLockGate = ({ children }: PropsWithChildren) => {
  const tailwind = useTailwind();
  const enabled = useAppSelector(selectBiometricLockEnabled);
  const loggedIn = useAppSelector(selectLoggedIn);
  const logout = useLogout();

  const active = enabled && loggedIn;
  // The app opens locked. The state is already restored here, so a cold start
  // sees the real setting.
  const [locked, setLocked] = useState(active);
  const backgroundedAt = useRef<number | null>(null);
  const prompting = useRef(false);

  const unlock = useCallback(async () => {
    if (prompting.current) {
      return;
    }
    prompting.current = true;
    try {
      if (!(await isDeviceSecured())) {
        setLocked(false);
        return;
      }
      if (await authenticateUser(i18n.t('APP_LOCK.PROMPT'))) {
        setLocked(false);
      }
    } finally {
      prompting.current = false;
    }
  }, []);

  useEffect(() => {
    if (!active) {
      setLocked(false);
    }
  }, [active]);

  useEffect(() => {
    if (locked) {
      unlock();
    }
  }, [locked, unlock]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background') {
        backgroundedAt.current = Date.now();
        return;
      }
      if (state !== 'active') {
        return;
      }
      const lockNow = shouldLockOnReturn({
        enabled: active,
        backgroundedAt: backgroundedAt.current,
        now: Date.now(),
      });
      backgroundedAt.current = null;
      if (lockNow && !prompting.current) {
        setLocked(true);
      }
    });
    return () => subscription.remove();
  }, [active]);

  return (
    <>
      {children}
      <Modal
        visible={locked}
        animationType="none"
        statusBarTranslucent
        navigationBarTranslucent
        // The system back button must not dismiss the lock.
        onRequestClose={() => {}}>
        <View style={tailwind.style('flex-1 items-center justify-center bg-gray-50 px-8')}>
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require('@/assets/images/logo.png')}
            style={tailwind.style('w-20 h-20')}
            resizeMode="contain"
          />
          <Text style={tailwind.style('mt-6 text-2xl text-gray-950 font-inter-semibold-20')}>
            {i18n.t('APP_LOCK.TITLE')}
          </Text>
          <Text style={tailwind.style('mt-2 mb-8 text-base text-gray-900 text-center')}>
            {i18n.t('APP_LOCK.SUBTITLE')}
          </Text>
          <View style={tailwind.style('w-full gap-3')}>
            <Button text={i18n.t('APP_LOCK.UNLOCK')} handlePress={unlock} />
            <Button
              variant="secondary"
              text={i18n.t('APP_LOCK.LOGOUT')}
              isDestructive
              handlePress={logout}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};
