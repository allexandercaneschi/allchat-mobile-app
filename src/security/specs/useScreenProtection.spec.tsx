import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import * as ScreenCapture from 'expo-screen-capture';

import { useScreenProtection } from '../useScreenProtection';

jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: jest.fn(),
  allowScreenCaptureAsync: jest.fn(),
}));

const Probe = () => {
  useScreenProtection();
  return null;
};

describe('useScreenProtection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ScreenCapture.preventScreenCaptureAsync as jest.Mock).mockResolvedValue(undefined);
    (ScreenCapture.allowScreenCaptureAsync as jest.Mock).mockResolvedValue(undefined);
  });

  it('blocks screen capture while mounted and releases it on unmount', async () => {
    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(<Probe />);
    });
    expect(ScreenCapture.preventScreenCaptureAsync).toHaveBeenCalledWith('allchat');

    await act(async () => tree.unmount());
    expect(ScreenCapture.allowScreenCaptureAsync).toHaveBeenCalledWith('allchat');
  });

  it('keeps going when the screen cannot be protected', async () => {
    (ScreenCapture.preventScreenCaptureAsync as jest.Mock).mockRejectedValue(new Error('x'));

    await expect(
      act(async () => {
        TestRenderer.create(<Probe />);
      }),
    ).resolves.not.toThrow();
  });
});
