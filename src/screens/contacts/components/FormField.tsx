import React from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';

import { useTailwind } from '@/theme/useTailwind';

type FormFieldProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};

export const FormField = ({ label, error, hint, style, ...inputProps }: FormFieldProps) => {
  const tailwind = useTailwind();
  return (
    <View style={tailwind.style('gap-2')}>
      <Text style={tailwind.style('font-inter-420-20 text-gray-950')}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={tailwind.color('text-gray-900')}
        style={[
          tailwind.style(
            'text-base font-inter-normal-20 tracking-[0.24px] leading-[20px] android:leading-[18px]',
            'py-2 px-3 rounded-xl text-gray-950 bg-blackA-A4',
            inputProps.multiline ? 'min-h-[96px]' : 'h-10',
          ),
          style,
        ]}
        {...inputProps}
      />
      {error ? (
        <Text style={tailwind.style('text-ruby-900')}>{error}</Text>
      ) : hint ? (
        <Text style={tailwind.style('text-sm text-gray-800')}>{hint}</Text>
      ) : null}
    </View>
  );
};
