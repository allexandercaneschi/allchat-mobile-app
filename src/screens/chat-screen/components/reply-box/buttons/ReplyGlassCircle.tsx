import { useTailwind } from '@/theme/useTailwind';
import React, { PropsWithChildren } from 'react';
import { View } from 'react-native';

export const ReplyGlassCircle = ({ children }: PropsWithChildren) => {
  const tailwind = useTailwind();
  return (
    <View style={tailwind.style('h-9 w-9 items-center justify-center')}>
      {<View style={tailwind.style('absolute inset-0 rounded-full bg-gray-100')} />}
      {children}
    </View>
  );
};
