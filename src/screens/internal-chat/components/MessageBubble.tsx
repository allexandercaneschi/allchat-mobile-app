import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useTailwind } from '@/theme/useTailwind';
import i18n from '@/i18n';
import type {
  InternalChatChannel,
  InternalChatMessage,
} from '@/store/internal-chat/internalChatTypes';
import {
  canClaimHelpRequest,
  canResolveHelpRequest,
  formatMessageTime,
  getHelpRequestStatus,
} from '../utils';

type MessageBubbleProps = {
  message: InternalChatMessage;
  channel: InternalChatChannel;
  userId?: number;
  // True while a claim or resolve of this message is in flight.
  isBusy?: boolean;
  onClaim: (message: InternalChatMessage) => void;
  onResolve: (message: InternalChatMessage) => void;
};

const NudgeLine = ({ message, userId }: Pick<MessageBubbleProps, 'message' | 'userId'>) => {
  const tailwind = useTailwind();
  const name = message.sender?.name ?? '';
  const isOwn = message.sender?.id === userId;
  return (
    <View style={tailwind.style('items-center py-2 px-6')} testID={`nudge-${message.id}`}>
      <Text style={tailwind.style('text-sm font-inter-420-20 text-gray-700 text-center')}>
        {isOwn
          ? i18n.t('INTERNAL_CHAT.CONVERSATION.NUDGE_SENT_SHORT')
          : i18n.t('INTERNAL_CHAT.CONVERSATION.NUDGE_RECEIVED', { name })}
        {` · ${formatMessageTime(message.createdAt)}`}
      </Text>
    </View>
  );
};

const HelpRequestCard = ({
  message,
  channel,
  userId,
  isBusy,
  onClaim,
  onResolve,
}: MessageBubbleProps) => {
  const tailwind = useTailwind();
  const status = getHelpRequestStatus(message);
  const senderName = message.sender?.name ?? '';
  const toTeam = channel.kind !== 'direct';
  const statusLabel =
    status === 'resolved'
      ? i18n.t('INTERNAL_CHAT.HELP_REQUEST.STATUS_RESOLVED')
      : status === 'claimed'
        ? i18n.t('INTERNAL_CHAT.HELP_REQUEST.STATUS_CLAIMED', { name: message.claimedBy?.name })
        : i18n.t('INTERNAL_CHAT.HELP_REQUEST.STATUS_OPEN');
  const showClaim = canClaimHelpRequest(message, userId);
  const showResolve = canResolveHelpRequest(message, userId);

  return (
    <View
      testID={`help-request-${message.id}`}
      style={tailwind.style(
        'mx-4 my-1.5 p-3 rounded-2xl border border-amber-700 bg-amber-50 gap-2',
      )}>
      <View style={tailwind.style('flex-row items-center justify-between gap-2')}>
        <Text style={tailwind.style('text-sm font-inter-semibold-20 text-amber-700')}>
          {i18n.t('INTERNAL_CHAT.HELP_REQUEST.TITLE')}
        </Text>
        <Text style={tailwind.style('text-xs font-inter-420-20 text-gray-700')}>
          {formatMessageTime(message.createdAt)}
        </Text>
      </View>
      <Text style={tailwind.style('text-xs font-inter-420-20 text-gray-700')}>
        {toTeam ? `${senderName} · ${i18n.t('INTERNAL_CHAT.HELP_REQUEST.TO_TEAM')}` : senderName}
      </Text>
      <Text style={tailwind.style('text-base font-inter-420-20 text-gray-950')}>
        {message.content}
      </Text>
      <Text
        testID={`help-request-status-${message.id}`}
        style={tailwind.style(
          'text-sm font-inter-medium-24',
          status === 'resolved' ? 'text-teal-700' : 'text-gray-900',
        )}>
        {statusLabel}
      </Text>
      {(showClaim || showResolve) && (
        <View style={tailwind.style('flex-row gap-2 pt-1')}>
          {showClaim && (
            <Pressable
              testID={`claim-${message.id}`}
              accessibilityRole="button"
              disabled={isBusy}
              onPress={() => onClaim(message)}
              style={tailwind.style(
                'px-4 py-2 rounded-full bg-blue-800 items-center justify-center',
                isBusy && 'opacity-60',
              )}>
              {isBusy ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={tailwind.style('text-sm font-inter-medium-24 text-white')}>
                  {i18n.t('INTERNAL_CHAT.HELP_REQUEST.CLAIM')}
                </Text>
              )}
            </Pressable>
          )}
          {showResolve && (
            <Pressable
              testID={`resolve-${message.id}`}
              accessibilityRole="button"
              disabled={isBusy}
              onPress={() => onResolve(message)}
              style={tailwind.style(
                'px-4 py-2 rounded-full bg-gray-100 items-center justify-center',
                isBusy && 'opacity-60',
              )}>
              <Text style={tailwind.style('text-sm font-inter-medium-24 text-gray-950')}>
                {i18n.t('INTERNAL_CHAT.HELP_REQUEST.RESOLVE')}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
};

export const MessageBubble = React.memo((props: MessageBubbleProps) => {
  const { message, channel, userId } = props;
  const tailwind = useTailwind();

  if (message.kind === 'nudge') return <NudgeLine message={message} userId={userId} />;
  if (message.kind === 'help_request') return <HelpRequestCard {...props} />;

  const isOwn = message.sender?.id === userId;
  // In a room there are many people: show who wrote.
  const showName = !isOwn && channel.kind !== 'direct';
  return (
    <View
      style={tailwind.style('px-4 py-1', isOwn ? 'items-end' : 'items-start')}
      testID={`message-${message.id}`}>
      <View
        style={tailwind.style(
          'max-w-[82%] px-3 py-2 rounded-2xl gap-0.5',
          isOwn ? 'bg-blue-800' : 'bg-gray-100',
        )}>
        {showName && (
          <Text style={tailwind.style('text-xs font-inter-semibold-20 text-blue-800')}>
            {message.sender?.name}
          </Text>
        )}
        {message.urgent && (
          <Text
            testID={`urgent-${message.id}`}
            style={tailwind.style(
              'text-xs font-inter-semibold-20',
              isOwn ? 'text-white' : 'text-ruby-800',
            )}>
            {i18n.t('INTERNAL_CHAT.CONVERSATION.URGENT').toUpperCase()}
          </Text>
        )}
        <Text
          selectable
          style={tailwind.style(
            'text-base font-inter-420-20',
            isOwn ? 'text-white' : 'text-gray-950',
          )}>
          {message.content}
        </Text>
        <Text
          style={tailwind.style(
            'text-xs font-inter-420-20 self-end',
            isOwn ? 'text-whiteA-A11' : 'text-gray-700',
          )}>
          {formatMessageTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
});
MessageBubble.displayName = 'MessageBubble';
