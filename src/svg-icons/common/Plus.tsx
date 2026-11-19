import React from 'react';
import { Path, Svg } from 'react-native-svg';

import { IconProps } from '../../types';

/** Solid plus, for primary actions (the AddIcon is a faded one used inside rows). */
export const PlusIcon = ({ stroke = 'black' }: IconProps): JSX.Element => (
  <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
    <Path d="M12 4.5V19.5M19.5 12H4.5" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);
