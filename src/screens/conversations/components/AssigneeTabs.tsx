import React, { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';

import i18n from '@/i18n';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { selectUser } from '@/store/auth/authSelectors';
import { selectFilters, setFilters } from '@/store/conversation/conversationFilterSlice';
import { useTailwind } from '@/theme/useTailwind';
import type { AssigneeTypes } from '@/types';
import { useHaptic } from '@/utils';
import { getUserPermissions } from '@/utils/permissionUtils';

import { getAvailableAssigneeTypes } from '../assigneeTabs';

const LABELS: Record<AssigneeTypes, string> = {
  me: 'CONVERSATION.TABS.ME',
  unassigned: 'CONVERSATION.TABS.UNASSIGNED',
  all: 'CONVERSATION.TABS.ALL',
};

/** Minhas / Sem responsável / Todas: switches the assignee filter of the conversation list. */
export const AssigneeTabs = () => {
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const haptic = useHaptic();
  const user = useAppSelector(selectUser);
  const { assignee_type: current } = useAppSelector(selectFilters);
  const types = getAvailableAssigneeTypes(user ? getUserPermissions(user, user.account_id) : []);

  const select = useCallback(
    (value: AssigneeTypes) => {
      if (value !== current) {
        haptic?.();
        dispatch(setFilters({ key: 'assignee_type', value }));
      }
    },
    [current, dispatch, haptic],
  );

  return (
    <View style={tailwind.style('flex-row gap-2 px-4 pb-2')}>
      {types.map(type => {
        const isActive = type === current;
        return (
          <Pressable
            key={type}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => select(type)}
            style={tailwind.style(
              'rounded-full px-4 py-1.5',
              isActive ? 'bg-blue-800' : 'bg-blackA-A4',
            )}>
            <Text
              style={tailwind.style(
                'text-sm font-inter-medium-24 leading-[20px]',
                isActive ? 'text-white' : 'text-gray-950',
              )}>
              {i18n.t(LABELS[type])}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};
