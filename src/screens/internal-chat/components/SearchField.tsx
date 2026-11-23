import React from 'react';
import { TextInput, View } from 'react-native';
import { useTailwind } from '@/theme/useTailwind';
import { SearchIcon } from '@/svg-icons';

type SearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
};

export const SearchField = ({ value, onChangeText, placeholder }: SearchFieldProps) => {
  const tailwind = useTailwind();
  return (
    <View
      style={tailwind.style('flex-row items-center mx-4 my-2 px-3 gap-2 rounded-xl bg-gray-100')}>
      <View style={tailwind.style('h-[18px] w-[18px]')}>
        <SearchIcon stroke={tailwind.color('text-gray-700')} />
      </View>
      <TextInput
        testID="search-input"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tailwind.color('text-gray-600')}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        style={tailwind.style('flex-1 h-[40px] text-base font-inter-420-20 text-gray-950')}
      />
    </View>
  );
};
