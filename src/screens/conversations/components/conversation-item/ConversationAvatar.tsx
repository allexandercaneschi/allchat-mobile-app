import { useTailwind } from '@/theme/useTailwind';
import React, { memo } from 'react';
import { ImageURISource } from 'react-native';
import { LinearTransition } from 'react-native-reanimated';
import { isEqual } from 'lodash';

import { Avatar, AvatarStatusType } from '@/components-next/common';
import { AnimatedNativeView } from '@/components-next/native-components';
import { AvailabilityStatus } from '@/types';

type ConversationAvatarProps = {
  src: ImageURISource;
  name: string;
  status: AvailabilityStatus;
};

const checkIfPropsAreSame = (prev: ConversationAvatarProps, next: ConversationAvatarProps) => {
  const arePropsEqual = isEqual(prev, next);
  return arePropsEqual;
};

export const ConversationAvatar = memo((props: ConversationAvatarProps) => {
  const tailwind = useTailwind();
  const { src, name, status } = props;
  const size = '4xl';
  return (
    <AnimatedNativeView
      style={tailwind.style('')}
      layout={LinearTransition.springify().mass(1).damping(21).stiffness(115)}>
      <Avatar
        size={size}
        initialsClassName={undefined}
        {...{ src, name, status: status as AvatarStatusType }}
      />
    </AnimatedNativeView>
  );
}, checkIfPropsAreSame);

ConversationAvatar.displayName = 'ConversationAvatar';
