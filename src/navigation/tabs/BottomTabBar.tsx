import { useTailwind } from '@/theme/useTailwind';
import React, { PropsWithChildren } from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectCurrentState } from '@/store/conversation/conversationHeaderSlice';

import {
  ContactsIconFilled,
  ContactsIconOutline,
  ConversationIconFilled,
  ConversationIconOutline,
  InboxIconFilled,
  InboxIconOutline,
  SettingsIconFilled,
  SettingsIconOutline,
} from '@/svg-icons';
import { useHaptic, useScaleAnimation, useSideTabBarLayout, useTabBarHeight } from '@/utils';

import { TabParamList } from './AppTabs';
import { useAppSelector } from '@/hooks';
import { SideToolbarSlot } from './SideToolbarSlot';

const tabExitSpringConfig = { damping: 20, stiffness: 360, mass: 1 };
const tabEnterSpringConfig = { damping: 30, stiffness: 360, mass: 1 };

type TabBarIconsProps = {
  focused: boolean;
  route: RouteProp<TabParamList, keyof TabParamList>;
  compact?: boolean | number;
};

const TabBarIcons = ({ focused, route, compact }: TabBarIconsProps) => {
  switch (route.name) {
    case 'Conversations':
      return focused ? (
        <ConversationIconFilled compact={compact} />
      ) : (
        <ConversationIconOutline compact={compact} />
      );
    case 'Inbox':
      return focused ? (
        <InboxIconFilled compact={compact} />
      ) : (
        <InboxIconOutline compact={compact} />
      );
    case 'Contacts':
      return focused ? (
        <ContactsIconFilled compact={compact} />
      ) : (
        <ContactsIconOutline compact={compact} />
      );
    case 'Settings':
      return focused ? (
        <SettingsIconFilled compact={compact} />
      ) : (
        <SettingsIconOutline compact={compact} />
      );
  }
};

type TabBarBackgroundProps = PropsWithChildren & { style?: StyleProp<ViewStyle> };

const FLOATING_TAB_WIDTH = 76;

const TabBarBackground = (props: TabBarBackgroundProps) => {
  const { children, style } = props;

  const currentState = useAppSelector(selectCurrentState);

  const tabBarHeight = useTabBarHeight();
  const sideTabBar = useSideTabBarLayout();
  const sideExitDistance = sideTabBar
    ? (sideTabBar.offset + sideTabBar.width) * (sideTabBar.edge === 'right' ? 1 : -1)
    : 0;

  const derivedAnimatedState = useDerivedValue(() =>
    currentState === 'Select'
      ? withSpring(1, tabExitSpringConfig)
      : withSpring(0, tabEnterSpringConfig),
  );

  const animatedTabBarStyle = useAnimatedStyle(() => {
    return {
      transform: sideTabBar
        ? [
            {
              translateX: interpolate(derivedAnimatedState.value, [0, 1], [0, sideExitDistance]),
            },
          ]
        : [
            {
              translateY: interpolate(derivedAnimatedState.value, [0, 1], [0, tabBarHeight]),
            },
          ],
    };
  });

  return <Animated.View style={[style, animatedTabBarStyle]}>{children}</Animated.View>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TabItem = (props: any) => {
  const tailwind = useTailwind();
  const { handlers, animatedStyle } = useScaleAnimation();

  const { onPress, onLongPress, isFocused, options, route, vertical, floating } = props;
  const sideTabBar = useSideTabBarLayout();
  const buttonSize = sideTabBar?.buttonSize ?? 34;
  const sideIconSize = Math.round(24 * (sideTabBar?.iconScale ?? 1));

  const hitSlop = React.useMemo(
    () =>
      vertical
        ? { top: 4, left: 6, right: 6, bottom: 4 }
        : { top: 2, left: 10, right: 10, bottom: 10 },
    [vertical],
  );

  // Use stable object reference for accessibilityState when not focused
  const accessibilityState = React.useMemo(
    () => (isFocused ? { selected: true } : {}),
    [isFocused],
  );
  return (
    <Animated.View
      style={[
        tailwind.style(
          'justify-center items-center',
          vertical
            ? `h-[${buttonSize}px] w-[${buttonSize}px] rounded-full ${isFocused ? 'bg-blackA-A3' : 'bg-transparent'}`
            : floating
              ? `h-[48px] w-[${FLOATING_TAB_WIDTH}px] rounded-full ${isFocused ? 'bg-blackA-A3' : 'bg-transparent'}`
              : 'flex-1 bg-transparent',
        ),
        animatedStyle,
      ]}>
      <Pressable
        hitSlop={hitSlop}
        {...handlers}
        accessibilityRole="button"
        accessibilityState={accessibilityState}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        testID={options.tabBarTestID}
        style={
          vertical
            ? tailwind.style(`h-[${buttonSize}px] w-[${buttonSize}px] items-center justify-center`)
            : floating
              ? tailwind.style(`h-[48px] w-[${FLOATING_TAB_WIDTH}px] items-center justify-center`)
              : undefined
        }
        onPress={onPress}
        onLongPress={onLongPress}>
        <TabBarIcons
          focused={isFocused}
          route={route}
          compact={vertical ? sideIconSize : floating ? 26 : undefined}
        />
      </Pressable>
    </Animated.View>
  );
};

export const BottomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const tailwind = useTailwind();
  const hapticSelection = useHaptic();
  const tabBarHeight = useTabBarHeight();
  const { bottom } = useSafeAreaInsets();
  const sideTabBar = useSideTabBarLayout();
  const floating = false;

  // Memoize press handlers using useCallback
  const createPressHandler = React.useCallback(
    (route: { key: string; name: string; params?: object }, isFocused: boolean) => {
      return () => {
        hapticSelection?.();
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
          navigation.navigate(route.name, route.params);
        }
      };
    },
    [hapticSelection, navigation],
  );

  // Memoize long press handler
  const createLongPressHandler = React.useCallback(
    (route: { key: string; name: string; params?: object }) => {
      return () => {
        navigation.emit({
          type: 'tabLongPress',
          target: route.key,
        });
      };
    },
    [navigation],
  );

  return (
    <>
      <SideToolbarSlot />
      <TabBarBackground
        style={[
          tailwind.style(
            'flex flex-row absolute w-full bottom-0 px-6 pt-[11px] bg-white',
            `h-[${tabBarHeight}px] pb-[${bottom + 11}px]`,
          ),
        ]}>
        {!sideTabBar && !floating && (
          <Animated.View style={tailwind.style('absolute inset-0 h-[1px] bg-blackA-A3')} />
        )}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          return (
            <TabItem
              key={route.key}
              options={options}
              onPress={createPressHandler(route, isFocused)}
              onLongPress={createLongPressHandler(route)}
              route={route}
              isFocused={isFocused}
              vertical={!!sideTabBar}
              floating={floating}
            />
          );
        })}
      </TabBarBackground>
    </>
  );
};
