import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_HEIGHT } from '@/constants';

export type SideTabBarLayout = {
  edge: 'left' | 'right';
  offset: number;
  contentPadding: number;
  contentTopPadding: number;
  width: number;
  buttonSize: number;
  iconScale: number;
};

const SPLIT_VIEW_MIN_WIDTH = 600;

// The side tab bar exists only on iPad/iPhone landscape layouts, so on Android there is never one.
export const useSideTabBarLayout = (): SideTabBarLayout | null => null;

export const isPhoneNumberName = (name?: string | null) => /^[\d\s+().-]*$/.test(name ?? '');

export const useIsSplitLayout = () => {
  const { width } = useWindowDimensions();
  const { left, right } = useSafeAreaInsets();
  const sideTabBar = useSideTabBarLayout();
  return sideTabBar !== null && width - left - right >= SPLIT_VIEW_MIN_WIDTH;
};

export const useTabBarHeight = () => {
  const { bottom } = useSafeAreaInsets();
  const sideTabBar = useSideTabBarLayout();
  if (sideTabBar) return bottom;
  return TAB_BAR_HEIGHT - 21 + bottom;
};
