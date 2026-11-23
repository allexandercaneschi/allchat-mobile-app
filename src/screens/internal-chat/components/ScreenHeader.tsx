import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTailwind } from '@/theme/useTailwind';
import i18n from '@/i18n';
import { ChevronLeft } from '@/svg-icons';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string | null;
  onBack?: () => void;
  right?: React.ReactNode;
};

export const ScreenHeader = ({ title, subtitle, onBack, right }: ScreenHeaderProps) => {
  const tailwind = useTailwind();
  return (
    <View
      style={tailwind.style(
        'flex-row items-center px-4 py-3 gap-3 border-b border-gray-200 bg-white',
      )}>
      {onBack && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={i18n.t('CONVERSATION.HEADER.BACK')}
          hitSlop={12}
          onPress={onBack}
          style={tailwind.style('h-[24px] w-[24px]')}>
          <ChevronLeft stroke={tailwind.color('text-gray-950')} strokeWidth={1.5} />
        </Pressable>
      )}
      <View style={tailwind.style('flex-1')}>
        <Text
          numberOfLines={1}
          style={tailwind.style('text-lg font-inter-semibold-20 text-gray-950')}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={tailwind.style('text-xs font-inter-420-20 text-gray-700')}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
};

export const PillButton = ({
  label,
  onPress,
  disabled,
  testID,
  tone = 'default',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
  tone?: 'default' | 'danger' | 'primary';
}) => {
  const tailwind = useTailwind();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={tailwind.style(
        'px-3 py-1.5 rounded-full',
        tone === 'primary' ? 'bg-blue-800' : tone === 'danger' ? 'bg-ruby-700' : 'bg-gray-100',
        disabled && 'opacity-50',
      )}>
      <Text
        style={tailwind.style(
          'text-sm font-inter-medium-24',
          tone === 'default' ? 'text-gray-950' : 'text-white',
        )}>
        {label}
      </Text>
    </Pressable>
  );
};
