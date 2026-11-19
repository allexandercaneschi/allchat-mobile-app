import { useTailwind } from '@/theme/useTailwind';
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { TabIconProps, tabIconCanvas } from './frame';

const HEAD = { cx: 24, cy: 9, r: 4 };
const SHOULDERS = 'M16 23C16 18.6 19.6 16 24 16C28.4 16 32 18.6 32 23';

export const ContactsIconOutline = ({ compact }: TabIconProps = {}) => {
  const tailwind = useTailwind();
  const stroke = tailwind.color('text-gray-950');
  return (
    <Svg {...tabIconCanvas(compact, 48)} fill="none">
      <Circle {...HEAD} stroke={stroke} strokeWidth="1.5" />
      <Path
        d={SHOULDERS}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export const ContactsIconFilled = ({ compact }: TabIconProps = {}) => {
  const tailwind = useTailwind();
  const fill = tailwind.color('text-gray-950');
  return (
    <Svg {...tabIconCanvas(compact, 48)} fill="none">
      <Circle {...HEAD} fill={fill} />
      <Path d={`${SHOULDERS}Z`} fill={fill} />
    </Svg>
  );
};
