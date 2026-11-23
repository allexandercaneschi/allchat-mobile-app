// Types of the internal team chat (ALLChat backend, `internal_chat` API). The API speaks snake_case;
// everything is converted to camelCase by `internalChatTransforms.ts` before it reaches the store.

export type InternalChatChannelKind = 'direct' | 'team_room' | 'company_room';

// Who can send messages in a room. Direct conversations are always `everyone`.
export type InternalChatPostingPolicy = 'everyone' | 'admins_only' | 'admins_and_supervisors';

export type InternalChatMessageKind = 'text' | 'help_request' | 'nudge';

export type InternalChatUser = {
  id: number;
  name: string;
  availableName?: string;
  avatarUrl?: string | null;
  thumbnail?: string | null;
  availabilityStatus?: string;
};

export type InternalChatMessage = {
  id: number;
  channelId: number;
  kind: InternalChatMessageKind;
  content: string;
  urgent: boolean;
  mentionedUserIds: number[];
  sender: InternalChatUser | null;
  // Set on a help request sent to one person; empty when it goes to a team.
  recipientId: number | null;
  conversationId: number | null;
  claimedBy: InternalChatUser | null;
  claimedAt: number | null;
  resolvedAt: number | null;
  createdAt: number;
};

export type InternalChatChannel = {
  id: number;
  kind: InternalChatChannelKind;
  // Only on team rooms.
  team: { id: number; name: string } | null;
  // Only on the company room (the account name).
  name: string | null;
  postingPolicy: InternalChatPostingPolicy;
  // False when the posting policy of the room does not allow the current user to send.
  canPost: boolean;
  // The other person, on direct conversations.
  user: InternalChatUser | null;
  unreadCount: number;
  lastMessage: InternalChatMessage | null;
  lastActivityAt: number;
};

export type InternalChatMessagesPage = {
  payload: InternalChatMessage[];
  hasMore: boolean;
};

export type SendHelpRequestPayload = {
  // Exactly one of the two.
  recipientId?: number;
  teamId?: number;
  content: string;
  // `display_id` of a customer conversation the request is about (optional).
  conversationId?: number;
};

export type ClaimHelpRequestResult = {
  message: InternalChatMessage;
  // Direct conversation with whoever asked for help.
  channelId: number;
  joinedConversation: boolean;
};

export type InternalChatSearchPage = {
  payload: InternalChatMessage[];
  hasMore: boolean;
};

export type InternalChatState = {
  channels: Record<number, InternalChatChannel>;
  messages: Record<number, InternalChatMessage[]>;
  hasMoreMessages: Record<number, boolean>;
  // Channel on screen right now. Messages that arrive in it are read right away.
  viewingChannelId: number | null;
  // Timestamp (ms) when the attention nudge can be used again, per channel.
  nudgeAvailableAt: Record<number, number>;
  uiFlags: {
    isLoadingChannels: boolean;
    hasLoadedChannels: boolean;
    isLoadingMessages: Record<number, boolean>;
  };
};
