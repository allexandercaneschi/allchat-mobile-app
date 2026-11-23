import React from 'react';
import { AppState, AppStateStatus, Modal } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

import { AppLockGate } from '../AppLockGate';
import { LOCK_GRACE_MS } from '@/security/appLock';
import { authenticateUser, isDeviceSecured } from '@/security/biometricAuth';

const mockSelected: Record<string, boolean> = {};

jest.mock('@/hooks', () => ({ useAppSelector: (key: string) => mockSelected[key] }));
jest.mock('@/hooks/useLogout', () => ({ useLogout: () => jest.fn() }));
jest.mock('@/store/settings/settingsSelectors', () => ({ selectBiometricLockEnabled: 'enabled' }));
jest.mock('@/store/auth/authSelectors', () => ({ selectLoggedIn: 'loggedIn' }));
jest.mock('@/security/biometricAuth', () => ({
  isDeviceSecured: jest.fn(),
  authenticateUser: jest.fn(),
}));
jest.mock('@/components-next/button', () => ({ Button: 'Button' }));
jest.mock('@/theme/useTailwind', () => ({ useTailwind: () => ({ style: () => ({}) }) }));
jest.mock('@/i18n', () => ({ t: (key: string) => key }));
jest.mock('@/assets/images/logo.png', () => 1, { virtual: true });

let appStateHandler: (state: AppStateStatus) => void = () => {};
const remove = jest.fn();

const render = async () => {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(<AppLockGate>{null}</AppLockGate>);
  });
  return tree;
};
const isLocked = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root.findByType(Modal).props.visible as boolean;
const changeAppState = async (state: AppStateStatus) => {
  await act(async () => {
    appStateHandler(state);
  });
};

describe('AppLockGate', () => {
  let now = 1_000_000;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelected.enabled = true;
    mockSelected.loggedIn = true;
    (isDeviceSecured as jest.Mock).mockResolvedValue(true);
    (authenticateUser as jest.Mock).mockResolvedValue(true);
    now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((
      _: string,
      handler: (state: AppStateStatus) => void,
    ) => {
      appStateHandler = handler;
      return { remove };
    }) as unknown as typeof AppState.addEventListener);
  });

  afterEach(() => jest.restoreAllMocks());

  it('asks for authentication when the app opens and unlocks on success', async () => {
    const tree = await render();

    expect(authenticateUser).toHaveBeenCalledTimes(1);
    expect(isLocked(tree)).toBe(false);
  });

  it('stays locked when authentication fails', async () => {
    (authenticateUser as jest.Mock).mockResolvedValue(false);

    const tree = await render();

    expect(isLocked(tree)).toBe(true);
  });

  it('does nothing when the option is off', async () => {
    mockSelected.enabled = false;

    const tree = await render();

    expect(authenticateUser).not.toHaveBeenCalled();
    expect(isLocked(tree)).toBe(false);
  });

  it('does nothing when nobody is signed in', async () => {
    mockSelected.loggedIn = false;

    const tree = await render();

    expect(authenticateUser).not.toHaveBeenCalled();
    expect(isLocked(tree)).toBe(false);
  });

  it('does not lock a device that has no screen lock', async () => {
    (isDeviceSecured as jest.Mock).mockResolvedValue(false);

    const tree = await render();

    expect(authenticateUser).not.toHaveBeenCalled();
    expect(isLocked(tree)).toBe(false);
  });

  it('does not ask again after a short trip out of the app', async () => {
    const tree = await render();
    (authenticateUser as jest.Mock).mockClear();

    await changeAppState('background');
    now += LOCK_GRACE_MS - 1;
    await changeAppState('active');

    expect(authenticateUser).not.toHaveBeenCalled();
    expect(isLocked(tree)).toBe(false);
  });

  it('locks and asks again after a long time in the background', async () => {
    (authenticateUser as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const tree = await render();

    await changeAppState('background');
    now += LOCK_GRACE_MS;
    await changeAppState('active');

    expect(authenticateUser).toHaveBeenCalledTimes(2);
    expect(isLocked(tree)).toBe(true);
  });

  it('stops listening when it unmounts', async () => {
    const tree = await render();

    act(() => tree.unmount());

    expect(remove).toHaveBeenCalled();
  });
});
