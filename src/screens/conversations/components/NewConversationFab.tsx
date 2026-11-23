import React from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Icon } from '@/components-next/common';
import i18n from '@/i18n';
import type { TabBarExcludedScreenParamList } from '@/navigation/tabs/AppTabs';
import { PlusIcon } from '@/svg-icons';
import { useTailwind } from '@/theme/useTailwind';
import { useTabBarHeight } from '@/utils';

/** Round "+" button over the conversation list that opens the new conversation screen. */
export const NewConversationFab = () => {
  const tailwind = useTailwind();
  const tabBarHeight = useTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<TabBarExcludedScreenParamList>>();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={i18n.t('NEW_CONVERSATION.ACCESSIBILITY')}
      onPress={() => navigation.navigate('NewConversation', {})}
      style={[
        tailwind.style(
          'absolute right-4 h-14 w-14 items-center justify-center rounded-full bg-blue-800',
        ),
        { bottom: tabBarHeight + 16, elevation: 6 },
      ]}>
      <Icon size={28} icon={<PlusIcon stroke="#FFFFFF" />} />
    </Pressable>
  );
};
