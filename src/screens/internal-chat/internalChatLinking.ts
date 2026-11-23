import type { Notification } from '@/types/Notification';

// `notification_type` of the push the ALLChat server sends for an internal chat message.
export const INTERNAL_CHAT_PUSH_TYPE = 'internal_message';

const PATH_REGEX = /^\/?app\/accounts\/(\d+)\/internal_chat\/(\d+)\/?$/;

export const buildInternalChatLink = (
  installationUrl: string,
  accountId: number | string,
  channelId: number | string,
) => `${installationUrl}/app/accounts/${accountId}/internal_chat/${channelId}`;

// The push data is `{ notification_type: 'internal_message', primary_actor: { id, channel_id }, urgent }`
// (see InternalChat::PushNotificationService on the server). Returns the deep link of the conversation.
export const findInternalChatLinkFromPush = ({
  notification,
  installationUrl,
  currentAccountId,
}: {
  notification: Notification;
  installationUrl: string;
  currentAccountId?: number;
}): string | undefined => {
  if ((notification.notificationType as string) !== INTERNAL_CHAT_PUSH_TYPE) return undefined;
  const channelId = (notification.primaryActor as unknown as { channelId?: number } | undefined)
    ?.channelId;
  const accountId = notification.accountId ?? currentAccountId;
  if (!channelId || !accountId) return undefined;
  return buildInternalChatLink(installationUrl, accountId, channelId);
};

// Path of a deep link (without the server URL) -> account and conversation, or null if it is not one.
export const parseInternalChatPath = (
  path: string,
): { accountId: number; channelId: number } | null => {
  const match = path.split('?')[0].match(PATH_REGEX);
  return match ? { accountId: Number(match[1]), channelId: Number(match[2]) } : null;
};

// Navigation state: the tabs below (on the team chat tab) and the conversation on top.
export const buildInternalChatState = (channelId: number) => ({
  routes: [
    { name: 'Tab', state: { routes: [{ name: 'InternalChat' }] } },
    { name: 'InternalChatConversation', params: { channelId } },
  ],
});
