import React from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { Icon, IconButton } from '@/components-next';

import { MailIcon, PhoneIcon } from '@/svg-icons';
import { useTailwind } from '@/theme/useTailwind';
import { useHaptic, useScaleAnimation } from '@/utils';
import i18n from '@/i18n';
import { openNumber, openEmail } from '@/utils/urlUtils';
import { useContainerWidth } from '@/context';
import { useIsInContactPane } from '@/navigation/split/SplitViewContext';

type ContactOption = {
  contactType: 'call' | 'email';
  icon: React.ReactNode;
};

type ContactOptionProps = {
  option: ContactOption;
  handleOptionPress?: () => void;
  disabled?: boolean;
};

const ContactOptionComponent = (props: ContactOptionProps) => {
  const tailwind = useTailwind();
  const isInContactPane = useIsInContactPane();
  const OPTION_WIDTH = (useContainerWidth() - 32 - 12 * 3) / 2;
  const { option, handleOptionPress, disabled = false } = props;

  const { handlers, animatedStyle } = useScaleAnimation();
  const hapticSelection = useHaptic();

  const handleOnPress = () => {
    hapticSelection?.();
    handleOptionPress?.();
  };

  return (
    <Animated.View style={[tailwind.style('flex-1'), animatedStyle]}>
      <Pressable
        style={({ pressed }) => [
          tailwind.style(
            'flex items-center justify-center flex-1 rounded-xl py-3',
            isInContactPane ? 'bg-white' : 'bg-gray-50',
            `w-[${OPTION_WIDTH}px]`,
            pressed ? 'bg-gray-100' : '',
            disabled ? 'opacity-40' : '',
          ),
        ]}
        disabled={disabled}
        accessibilityState={{ disabled }}
        onPress={handleOnPress}
        {...handlers}>
        <Icon icon={option.icon} size={24} />
        <Animated.Text
          numberOfLines={1}
          style={tailwind.style(
            'text-cxs font-inter-medium-24 leading-[15px] tracking-[0.32px] text-center text-blue-800 pt-2',
          )}>
          {option.contactType}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
};

type ContactBasicActionsProps = {
  phoneNumber?: string;
  email?: string;
  style?: StyleProp<ViewStyle>;
};

export const ContactBasicActions = (props: ContactBasicActionsProps) => {
  const tailwind = useTailwind();
  const isInContactPane = useIsInContactPane();
  const { phoneNumber, email, style } = props;

  const onCallPress = () => {
    if (phoneNumber) openNumber({ phoneNumber });
  };

  const onEmailPress = () => {
    if (!email) {
      return;
    }
    openEmail({ email });
  };

  const canCall = !!phoneNumber;
  if (!email && !canCall) {
    return null;
  }

  if (email && canCall) {
    return (
      <Animated.View style={[tailwind.style('flex flex-row justify-between '), style]}>
        <ContactOptionComponent
          key="email"
          option={{
            contactType: i18n.t('CONTACT_DETAILS.EMAIL'),
            icon: <MailIcon strokeWidth={2} stroke={tailwind.color('bg-blue-800')} />,
          }}
          handleOptionPress={onEmailPress}
        />
        <ContactOptionComponent
          key="call"
          option={{
            contactType: i18n.t('CONTACT_DETAILS.CALL'),
            icon: <PhoneIcon strokeWidth={2} stroke={tailwind.color('bg-blue-800')} />,
          }}
          handleOptionPress={onCallPress}
        />
      </Animated.View>
    );
  }

  if (canCall) {
    return (
      <Animated.View style={style}>
        <IconButton
          text={i18n.t('CONTACT_DETAILS.CALL')}
          variant="secondary"
          secondaryBackground={isInContactPane ? 'bg-white' : undefined}
          handlePress={onCallPress}
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={style}>
      <IconButton
        text={i18n.t('CONTACT_DETAILS.EMAIL')}
        variant="secondary"
        secondaryBackground={isInContactPane ? 'bg-white' : undefined}
        handlePress={onEmailPress}
        icon={<MailIcon strokeWidth={2} stroke={tailwind.color('bg-blue-800')} />}
      />
    </Animated.View>
  );
};
