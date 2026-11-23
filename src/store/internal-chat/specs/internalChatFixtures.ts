import type { InternalChatChannel, InternalChatMessage } from '../internalChatTypes';

export const ME = { id: 1, name: 'Eu' };
export const ANA = { id: 2, name: 'Ana' };

export const buildMessage = (
  overrides: Partial<InternalChatMessage> = {},
): InternalChatMessage => ({
  id: 10,
  channelId: 100,
  kind: 'text',
  content: 'olá',
  urgent: false,
  mentionedUserIds: [],
  sender: ANA,
  recipientId: null,
  conversationId: null,
  claimedBy: null,
  claimedAt: null,
  resolvedAt: null,
  createdAt: 1000,
  ...overrides,
});

export const buildChannel = (
  overrides: Partial<InternalChatChannel> = {},
): InternalChatChannel => ({
  id: 100,
  kind: 'direct',
  team: null,
  name: null,
  postingPolicy: 'everyone',
  canPost: true,
  user: ANA,
  unreadCount: 0,
  lastMessage: null,
  lastActivityAt: 500,
  ...overrides,
});
