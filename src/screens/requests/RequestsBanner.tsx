import React from 'react';
import { Pressable, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import i18n from '@/i18n';
import type { TabBarExcludedScreenParamList } from '@/navigation/tabs/AppTabs';
import { useTailwind } from '@/theme/useTailwind';

import { useIncomingRequests } from './useIncomingRequests';

/** Shown on top of the conversation list while someone waits for the agent's answer. */
export const RequestsBanner = () => {
  const tailwind = useTailwind();
  const navigation = useNavigation<NativeStackNavigationProp<TabBarExcludedScreenParamList>>();
  const count = useIncomingRequests().length;

  if (count === 0) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => navigation.navigate('ConversationRequests')}
      style={tailwind.style('mx-4 mb-2 rounded-xl bg-blue-800 px-4 py-2.5')}>
      <Text style={tailwind.style('text-sm font-inter-medium-24 text-white')}>
        {count === 1 ? i18n.t('REQUESTS.BANNER_ONE') : i18n.t('REQUESTS.BANNER_MANY', { count })}
      </Text>
    </Pressable>
  );
};
