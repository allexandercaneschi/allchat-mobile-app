import { format, fromUnixTime, isSameDay } from 'date-fns';
import i18n from '@/i18n';
import type {
  InternalChatChannel,
  InternalChatMessage,
  InternalChatUser,
} from '@/store/internal-chat/internalChatTypes';

// Name shown for a conversation: the other person, the team or the company.
export const getChannelTitle = (channel: InternalChatChannel): string => {
  if (channel.kind === 'team_room') return channel.team?.name ?? i18n.t('INTERNAL_CHAT.TEAM_ROOM');
  if (channel.kind === 'company_room') return channel.name || i18n.t('INTERNAL_CHAT.COMPANY_ROOM');
  return channel.user?.name ?? '';
};

// Small line under the name for the rooms ("Sala do time", "Sala da empresa").
export const getChannelSubtitle = (channel: InternalChatChannel): string | null => {
  if (channel.kind === 'team_room') return i18n.t('INTERNAL_CHAT.TEAM_ROOM');
  if (channel.kind === 'company_room') return i18n.t('INTERNAL_CHAT.COMPANY_ROOM');
  return null;
};

// Why the composer is disabled in a room, or null when the user can send.
export const getPostingBlockedReason = (channel: InternalChatChannel): string | null => {
  if (channel.canPost) return null;
  return channel.postingPolicy === 'admins_and_supervisors'
    ? i18n.t('INTERNAL_CHAT.CONVERSATION.CANNOT_POST_ADMINS_AND_SUPERVISORS')
    : i18n.t('INTERNAL_CHAT.CONVERSATION.CANNOT_POST_ADMINS_ONLY');
};

// One-line preview of the last message, for the list.
export const getMessagePreview = (message: InternalChatMessage, userId?: number): string => {
  const isOwn = message.sender?.id === userId;
  const name = message.sender?.name ?? '';
  if (message.kind === 'nudge') {
    return isOwn
      ? i18n.t('INTERNAL_CHAT.CONVERSATION.NUDGE_SENT_SHORT')
      : i18n.t('INTERNAL_CHAT.CONVERSATION.NUDGE_RECEIVED', { name });
  }
  const prefix = isOwn ? `${i18n.t('INTERNAL_CHAT.YOU')}: ` : '';
  return `${prefix}${message.content}`;
};

export const formatMessageTime = (timestamp: number): string =>
  format(fromUnixTime(timestamp), 'HH:mm');

// Time for the list: the hour for today, the day and month otherwise.
export const formatChannelTime = (timestamp: number, now: Date = new Date()): string => {
  const date = fromUnixTime(timestamp);
  return isSameDay(date, now) ? format(date, 'HH:mm') : format(date, 'dd/MM');
};

export type HelpRequestStatus = 'open' | 'claimed' | 'resolved';

export const getHelpRequestStatus = (message: InternalChatMessage): HelpRequestStatus => {
  if (message.resolvedAt) return 'resolved';
  return message.claimedBy ? 'claimed' : 'open';
};

// Anyone in the room can take an open request, except who asked for it. The first one wins.
export const canClaimHelpRequest = (message: InternalChatMessage, userId?: number): boolean =>
  message.kind === 'help_request' &&
  getHelpRequestStatus(message) === 'open' &&
  userId !== undefined &&
  message.sender?.id !== userId;

// Only who asked or who took it can resolve it.
export const canResolveHelpRequest = (message: InternalChatMessage, userId?: number): boolean =>
  message.kind === 'help_request' &&
  getHelpRequestStatus(message) !== 'resolved' &&
  userId !== undefined &&
  (message.sender?.id === userId || message.claimedBy?.id === userId);

// Seconds left until the nudge can be used again (0 when it can be used now).
export const getNudgeSecondsLeft = (availableAt: number, now: number = Date.now()): number =>
  Math.max(0, Math.ceil((availableAt - now) / 1000));

// Case-insensitive, accent-insensitive match, so "joao" finds "João".
const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const matchesQuery = (text: string, query: string): boolean =>
  normalize(text).includes(normalize(query.trim()));

export const filterChannels = (
  channels: InternalChatChannel[],
  query: string,
): InternalChatChannel[] =>
  query.trim()
    ? channels.filter(channel => matchesQuery(getChannelTitle(channel), query))
    : channels;

// Colleagues I can chat with: everybody but me, filtered by name.
export const filterAgents = (
  agents: InternalChatUser[],
  currentUserId: number | undefined,
  query: string,
): InternalChatUser[] =>
  agents.filter(
    agent => agent.id !== currentUserId && (!query.trim() || matchesQuery(agent.name, query)),
  );

// Minimum characters the server needs to search messages.
export const MIN_SEARCH_LENGTH = 2;
