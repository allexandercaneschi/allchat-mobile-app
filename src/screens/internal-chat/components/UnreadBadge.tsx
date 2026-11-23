import React from 'react';
import { Text, View } from 'react-native';
import { useTailwind } from '@/theme/useTailwind';

const MAX_COUNT = 99;

// Blue pill with the number of unread messages. Nothing is drawn for zero.
export const UnreadBadge = ({ count, testID }: { count: number; testID?: string }) => {
  const tailwind = useTailwind();
  if (count <= 0) return null;
  return (
    <View
      testID={testID}
      style={tailwind.style(
        'min-w-[20px] h-[20px] px-1.5 rounded-full bg-blue-800 items-center justify-center',
      )}>
      <Text style={tailwind.style('text-xs font-inter-medium-24 text-white')}>
        {count > MAX_COUNT ? `${MAX_COUNT}+` : count}
      </Text>
    </View>
  );
};
