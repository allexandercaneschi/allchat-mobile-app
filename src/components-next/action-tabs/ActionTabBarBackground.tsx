import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppSelector } from '@/hooks';
import { selectCurrentState } from '@/store/conversation/conversationHeaderSlice';
import { ACTION_TAB_HEIGHT } from './actionTabsLayout';

const tabExitSpringConfig = { damping: 20, stiffness: 360, mass: 1 };
const tabEnterSpringConfig = { damping: 30, stiffness: 360, mass: 1 };

type ActionTabBarBackgroundProps = PropsWithChildren & { style?: StyleProp<ViewStyle> };

export const ActionTabBarBackground = (props: ActionTabBarBackgroundProps) => {
  const { children, style } = props;

  const currentState = useAppSelector(selectCurrentState);
  const { bottom } = useSafeAreaInsets();
  const hiddenOffset = bottom + 8 + ACTION_TAB_HEIGHT + 24;

  const derivedAnimatedState = useDerivedValue(() =>
    currentState === 'Select'
      ? withSpring(0, tabEnterSpringConfig)
      : withSpring(1, tabExitSpringConfig),
  );

  const animatedTabBarStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(derivedAnimatedState.value, [0, 1], [0, hiddenOffset]),
        },
      ],
    };
  });

  return (
    <Animated.View style={[style, animatedTabBarStyle, styles.listShadow]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  listShadow: {
    elevation: 4,
  },
});
