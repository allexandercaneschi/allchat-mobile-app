import { AppState, Vibration } from 'react-native';
import { store } from '@/store';
import i18n from '@/i18n';
import { showToast } from '@/utils/toastUtils';
import { selectUserId } from '@/store/auth/authSelectors';
import { internalChatActions } from './internalChatActions';
import { messageReceived, messageUpdated } from './internalChatSlice';
import { transformInternalChatMessage } from './internalChatTransforms';
import type { InternalChatMessage } from './internalChatTypes';

// Names of the websocket events sent by the ALLChat server to the members of a conversation.
export const INTERNAL_CHAT_MESSAGE_CREATED = 'internal_chat.message.created';
export const INTERNAL_CHAT_MESSAGE_UPDATED = 'internal_chat.message.updated';

const ATTENTION_VIBRATION_PATTERN = [0, 400, 200, 400];

// A message that must call attention: a nudge, a message marked as urgent or a mention.
export const isAttentionMessage = (message: InternalChatMessage, userId?: number) =>
  message.kind === 'nudge' ||
  message.urgent === true ||
  (userId !== undefined && message.mentionedUserIds.includes(userId));

const notifyAttention = (message: InternalChatMessage) => {
  const name = message.sender?.name ?? '';
  Vibration.vibrate(ATTENTION_VIBRATION_PATTERN);
  showToast({
    message:
      message.kind === 'nudge'
        ? i18n.t('INTERNAL_CHAT.ATTENTION.NUDGE', { name })
        : i18n.t('INTERNAL_CHAT.ATTENTION.URGENT', { name }),
  });
};

// `internal_chat.message.created`: a message in a conversation of the current user.
export const onInternalChatMessageCreated = (data: unknown) => {
  const message = transformInternalChatMessage(data);
  const state = store.getState();
  const userId = selectUserId(state);
  const isOwn = message.sender?.id === userId;
  const isKnownChannel = !!state.internalChat.channels[message.channelId];
  const isOnScreen = state.internalChat.viewingChannelId === message.channelId;

  store.dispatch(messageReceived({ message, userId }));

  // First message of a conversation somebody just opened with us.
  if (!isKnownChannel) store.dispatch(internalChatActions.fetchChannels());
  // Conversation on screen: it is read as it arrives.
  if (isOnScreen && !isOwn) store.dispatch(internalChatActions.markRead(message.channelId));
  // The push notification covers the app in the background; here the app is open.
  if (
    !isOwn &&
    !isOnScreen &&
    AppState.currentState === 'active' &&
    isAttentionMessage(message, userId)
  ) {
    notifyAttention(message);
  }
};

// `internal_chat.message.updated`: a help request was taken or resolved.
export const onInternalChatMessageUpdated = (data: unknown) => {
  store.dispatch(messageUpdated(transformInternalChatMessage(data)));
};
