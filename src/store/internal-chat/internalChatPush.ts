import { AppState } from 'react-native';
import { store } from '@/store';
import { findNotificationFromFCM } from '@/utils/pushUtils';
import { transformNotification } from '@/utils/camelCaseKeys';
import { INTERNAL_CHAT_PUSH_TYPE } from '@/screens/internal-chat/internalChatLinking';
import { alertAttention } from './internalChatAttention';
import { internalChatActions } from './internalChatActions';

type PushMessage = Parameters<typeof findNotificationFromFCM>[0]['message'] & {
  notification?: { title?: string };
};

// A push of the internal chat that arrives while the app is OPEN (Android does not show it then).
// Its `data.payload` carries `{ notification_type: 'internal_message', primary_actor: { id, channel_id },
// urgent }`. It does two things:
// - refreshes the conversations: if the websocket was down the message is only in the push;
// - for an urgent message or "call attention" (`urgent: true`) vibrates and shows the title of the
//   push, unless the conversation is on screen. The websocket alerts the same message too: the
//   attention memory makes sure it is alerted once.
// Returns true when the push was an internal chat one.
export const handleInternalChatPush = (message: PushMessage): boolean => {
  const raw = findNotificationFromFCM({ message });
  if (!raw) return false;
  const notification = transformNotification(raw);
  if ((notification.notificationType as string) !== INTERNAL_CHAT_PUSH_TYPE) return false;

  const channelId = (notification.primaryActor as unknown as { channelId?: number } | undefined)
    ?.channelId;
  const isUrgent = (raw as { urgent?: boolean }).urgent === true;
  const isOnScreen = !!channelId && store.getState().internalChat.viewingChannelId === channelId;

  store.dispatch(internalChatActions.fetchChannels());
  if (isUrgent && !isOnScreen && AppState.currentState === 'active') {
    const title = message.notification?.title;
    if (title && notification.primaryActorId) alertAttention(notification.primaryActorId, title);
  }
  return true;
};
