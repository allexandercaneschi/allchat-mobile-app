import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { Avatar } from '@/components-next/common';
import i18n from '@/i18n';
import { useTailwind } from '@/theme/useTailwind';
import type { Contact } from '@/types';
import { formatPhone } from '@/utils/phone';

type ContactRowProps = {
  contact: Contact;
  onPress: (contact: Contact) => void;
  /** Extra action on the right (e.g. start a conversation). */
  action?: React.ReactNode;
};

export const ContactRow = ({ contact, onPress, action }: ContactRowProps) => {
  const tailwind = useTailwind();
  const name = contact.name ?? '';
  const phone = formatPhone(contact.phoneNumber) || contact.email || i18n.t('CONTACTS.NO_PHONE');

  return (
    <View style={tailwind.style('flex-row items-center px-4')}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={name}
        onPress={() => onPress(contact)}
        style={tailwind.style('flex-1 flex-row items-center gap-3 py-3')}>
        <Avatar
          size="xl"
          name={name}
          src={contact.thumbnail ? { uri: contact.thumbnail } : undefined}
        />
        <View style={tailwind.style('flex-1')}>
          <Text
            numberOfLines={1}
            style={tailwind.style('text-base font-inter-medium-24 leading-[22px] text-gray-950')}>
            {name}
          </Text>
          <Text
            numberOfLines={1}
            style={tailwind.style('text-sm font-inter-normal-20 leading-[20px] text-gray-800')}>
            {phone}
          </Text>
        </View>
      </Pressable>
      {action}
    </View>
  );
};
