import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTailwind } from '@/theme/useTailwind';
import { Avatar } from '@/components-next/common/avatar';
import type { InternalChatChannel } from '@/store/internal-chat/internalChatTypes';
import {
  formatChannelTime,
  getChannelSubtitle,
  getChannelTitle,
  getMessagePreview,
} from '../utils';
import { UnreadBadge } from './UnreadBadge';

type ChannelListItemProps = {
  channel: InternalChatChannel;
  userId?: number;
  onPress: (channel: InternalChatChannel) => void;
};

export const ChannelListItem = React.memo(({ channel, userId, onPress }: ChannelListItemProps) => {
  const tailwind = useTailwind();
  const title = getChannelTitle(channel);
  const subtitle = getChannelSubtitle(channel);
  const { lastMessage } = channel;
  const hasUnread = channel.unreadCount > 0;
  const avatarUrl = channel.user?.avatarUrl || channel.user?.thumbnail;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => onPress(channel)}
      style={({ pressed }) =>
        tailwind.style('flex-row items-center px-4 py-3 gap-3', pressed && 'bg-gray-50')
      }>
      <Avatar
        size="xl"
        name={title}
        src={avatarUrl ? { uri: avatarUrl } : undefined}
        squared={channel.kind !== 'direct'}
      />
      <View style={tailwind.style('flex-1 gap-0.5')}>
        <View style={tailwind.style('flex-row items-center justify-between gap-2')}>
          <Text
            numberOfLines={1}
            style={tailwind.style(
              'flex-shrink text-base tracking-[0.24px] text-gray-950',
              hasUnread ? 'font-inter-semibold-20' : 'font-inter-medium-24',
            )}>
            {title}
          </Text>
          {lastMessage ? (
            <Text style={tailwind.style('text-xs font-inter-420-20 text-gray-700')}>
              {formatChannelTime(channel.lastActivityAt)}
            </Text>
          ) : null}
        </View>
        {subtitle ? (
          <Text style={tailwind.style('text-xs font-inter-420-20 text-blue-800')}>{subtitle}</Text>
        ) : null}
        <View style={tailwind.style('flex-row items-center justify-between gap-2')}>
          <Text
            numberOfLines={1}
            style={tailwind.style(
              'flex-1 text-sm font-inter-420-20',
              hasUnread ? 'text-gray-950' : 'text-gray-700',
            )}>
            {lastMessage ? getMessagePreview(lastMessage, userId) : ''}
          </Text>
          <UnreadBadge count={channel.unreadCount} testID={`unread-badge-${channel.id}`} />
        </View>
      </View>
    </Pressable>
  );
});
ChannelListItem.displayName = 'ChannelListItem';
