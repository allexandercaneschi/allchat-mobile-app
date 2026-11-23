import React from 'react';
import { Pressable, Text } from 'react-native';
import { useTailwind } from '@/theme/useTailwind';
import { Avatar } from '@/components-next/common/avatar';
import type { InternalChatUser } from '@/store/internal-chat/internalChatTypes';

type AgentRowProps = {
  agent: InternalChatUser;
  selected?: boolean;
  onPress: (agent: InternalChatUser) => void;
};

export const AgentRow = React.memo(({ agent, selected, onPress }: AgentRowProps) => {
  const tailwind = useTailwind();
  const avatarUrl = agent.avatarUrl || agent.thumbnail;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      testID={`agent-${agent.id}`}
      onPress={() => onPress(agent)}
      style={({ pressed }) =>
        tailwind.style(
          'flex-row items-center px-4 py-3 gap-3',
          (pressed || selected) && 'bg-gray-50',
        )
      }>
      <Avatar size="lg" name={agent.name} src={avatarUrl ? { uri: avatarUrl } : undefined} />
      <Text
        numberOfLines={1}
        style={tailwind.style('flex-1 text-base font-inter-medium-24 text-gray-950')}>
        {agent.name}
      </Text>
    </Pressable>
  );
});
AgentRow.displayName = 'AgentRow';
