import React from 'react';
import { View } from 'react-native';
import { useAppSelector } from '@/hooks';
import { selectInternalChatUnreadTotal } from '@/store/internal-chat/internalChatSelectors';
import { UnreadBadge } from './UnreadBadge';

// Unread counter drawn over the icon of the team chat tab.
export const InternalChatTabBadge = () => {
  const count = useAppSelector(selectInternalChatUnreadTotal);
  if (count <= 0) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: -6, right: -10 }}>
      <UnreadBadge count={count} testID="tab-unread-badge" />
    </View>
  );
};
