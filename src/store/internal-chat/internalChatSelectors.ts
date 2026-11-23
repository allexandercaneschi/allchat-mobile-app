import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import type { InternalChatChannel, InternalChatMessage } from './internalChatTypes';

const EMPTY_MESSAGES: InternalChatMessage[] = [];

export const selectInternalChat = (state: RootState) => state.internalChat;

export const selectInternalChatChannels = createSelector(
  selectInternalChat,
  internalChat => internalChat.channels,
);

// Most recent activity first.
export const selectInternalChatChannelList = createSelector(selectInternalChatChannels, channels =>
  Object.values(channels).sort((a, b) => b.lastActivityAt - a.lastActivityAt),
);

export const selectInternalChatChannel = (
  state: RootState,
  channelId: number,
): InternalChatChannel | undefined => state.internalChat.channels[channelId];

// Direct conversation with a colleague, if it already exists.
export const selectDirectChannelWithUser = (state: RootState, userId: number) =>
  Object.values(state.internalChat.channels).find(
    channel => channel.kind === 'direct' && channel.user?.id === userId,
  );

export const selectInternalChatTeamRooms = createSelector(selectInternalChatChannelList, channels =>
  channels.filter(channel => channel.kind === 'team_room' && channel.team),
);

export const selectInternalChatUnreadTotal = createSelector(selectInternalChatChannels, channels =>
  Object.values(channels).reduce((total, channel) => total + channel.unreadCount, 0),
);

// Oldest first, as the server stores them.
export const selectInternalChatMessages = (state: RootState, channelId: number) =>
  state.internalChat.messages[channelId] ?? EMPTY_MESSAGES;

export const selectInternalChatHasMore = (state: RootState, channelId: number) =>
  state.internalChat.hasMoreMessages[channelId] ?? false;

export const selectInternalChatIsLoadingMessages = (state: RootState, channelId: number) =>
  state.internalChat.uiFlags.isLoadingMessages[channelId] ?? false;

export const selectInternalChatHasLoadedChannels = (state: RootState) =>
  state.internalChat.uiFlags.hasLoadedChannels;

export const selectInternalChatIsLoadingChannels = (state: RootState) =>
  state.internalChat.uiFlags.isLoadingChannels;

export const selectInternalChatIsUnavailable = (state: RootState) =>
  state.internalChat.uiFlags.isUnavailable;

export const selectNudgeAvailableAt = (state: RootState, channelId: number) =>
  state.internalChat.nudgeAvailableAt[channelId] ?? 0;
