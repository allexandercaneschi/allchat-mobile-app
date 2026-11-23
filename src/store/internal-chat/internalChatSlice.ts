import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { internalChatActions, NUDGE_COOLDOWN_SECONDS } from './internalChatActions';
import type {
  InternalChatChannel,
  InternalChatMessage,
  InternalChatState,
} from './internalChatTypes';

export const initialState: InternalChatState = {
  channels: {},
  messages: {},
  hasMoreMessages: {},
  viewingChannelId: null,
  nudgeAvailableAt: {},
  uiFlags: { isLoadingChannels: false, hasLoadedChannels: false, isLoadingMessages: {} },
};

// Puts a message in the thread of its channel (once: a message that I send comes back both from the
// HTTP answer and from the websocket) and keeps the thread ordered by id.
const appendMessage = (state: InternalChatState, message: InternalChatMessage) => {
  const current = state.messages[message.channelId] ?? [];
  if (current.some(item => item.id === message.id)) return false;
  state.messages[message.channelId] = [...current, message].sort((a, b) => a.id - b.id);
  return true;
};

const replaceMessage = (state: InternalChatState, message: InternalChatMessage) => {
  const current = state.messages[message.channelId];
  if (current) {
    state.messages[message.channelId] = current.map(item =>
      item.id === message.id ? message : item,
    );
  }
  const channel = state.channels[message.channelId];
  if (channel?.lastMessage?.id === message.id) channel.lastMessage = message;
};

// The channel moves up the list and shows the message as its preview.
const touchChannel = (state: InternalChatState, message: InternalChatMessage) => {
  const channel = state.channels[message.channelId];
  if (!channel) return;
  if (!channel.lastMessage || message.id >= channel.lastMessage.id) {
    channel.lastMessage = message;
    channel.lastActivityAt = message.createdAt;
  }
};

const internalChatSlice = createSlice({
  name: 'internalChat',
  initialState,
  reducers: {
    // The screen of a conversation tells the store which one is on screen.
    setViewingChannel(state, action: PayloadAction<number | null>) {
      state.viewingChannelId = action.payload;
      const channel = action.payload ? state.channels[action.payload] : undefined;
      if (channel) channel.unreadCount = 0;
    },

    // Message from the websocket (`internal_chat.message.created`).
    messageReceived(
      state,
      action: PayloadAction<{ message: InternalChatMessage; userId?: number }>,
    ) {
      const { message, userId } = action.payload;
      const isNew = appendMessage(state, message);
      if (!isNew) return;
      touchChannel(state, message);
      const channel = state.channels[message.channelId];
      const isOwn = message.sender?.id === userId;
      const isOnScreen = state.viewingChannelId === message.channelId;
      if (channel && !isOwn && !isOnScreen) channel.unreadCount += 1;
    },

    // Message from the websocket (`internal_chat.message.updated`): a help request was taken or resolved.
    messageUpdated(state, action: PayloadAction<InternalChatMessage>) {
      replaceMessage(state, action.payload);
    },

    channelUpserted(state, action: PayloadAction<InternalChatChannel>) {
      state.channels[action.payload.id] = action.payload;
    },

    nudgeCooldownStarted(state, action: PayloadAction<{ channelId: number; seconds: number }>) {
      state.nudgeAvailableAt[action.payload.channelId] = Date.now() + action.payload.seconds * 1000;
    },

    // Account switch or logout: nothing of one account may show up in the other.
    resetInternalChat() {
      return initialState;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(internalChatActions.fetchChannels.pending, state => {
        state.uiFlags.isLoadingChannels = true;
      })
      .addCase(internalChatActions.fetchChannels.fulfilled, (state, action) => {
        state.uiFlags.isLoadingChannels = false;
        state.uiFlags.hasLoadedChannels = true;
        state.channels = Object.fromEntries(
          action.payload.map(channel => {
            // The conversation on screen is read as it goes: the server count may be a bit behind.
            const onScreen = state.viewingChannelId === channel.id;
            return [channel.id, onScreen ? { ...channel, unreadCount: 0 } : channel];
          }),
        );
      })
      .addCase(internalChatActions.fetchChannels.rejected, state => {
        state.uiFlags.isLoadingChannels = false;
      })

      .addCase(internalChatActions.fetchMessages.pending, (state, action) => {
        state.uiFlags.isLoadingMessages[action.meta.arg.channelId] = true;
      })
      .addCase(internalChatActions.fetchMessages.fulfilled, (state, action) => {
        const { channelId, payload, hasMore, older } = action.payload;
        state.uiFlags.isLoadingMessages[channelId] = false;
        const current = state.messages[channelId] ?? [];
        // First page: the server answer replaces the thread, but keeps messages that arrived
        // through the websocket meanwhile.
        const known = new Set(payload.map(message => message.id));
        const merged = older
          ? [...payload, ...current]
          : [...payload, ...current.filter(message => !known.has(message.id))];
        state.messages[channelId] = merged
          .filter((message, index, all) => all.findIndex(item => item.id === message.id) === index)
          .sort((a, b) => a.id - b.id);
        // A refresh of the first page cannot tell if there is more before older pages already loaded.
        const firstId = payload[0]?.id;
        const hasOlderLoaded = !older && !!firstId && current.some(message => message.id < firstId);
        state.hasMoreMessages[channelId] = hasOlderLoaded
          ? (state.hasMoreMessages[channelId] ?? hasMore)
          : hasMore;
      })
      .addCase(internalChatActions.fetchMessages.rejected, (state, action) => {
        state.uiFlags.isLoadingMessages[action.meta.arg.channelId] = false;
      })

      .addCase(internalChatActions.openDirectChannel.fulfilled, (state, action) => {
        const existing = state.channels[action.payload.id];
        state.channels[action.payload.id] = {
          ...action.payload,
          ...(existing && { unreadCount: existing.unreadCount }),
        };
      })

      // Zero the badge right away; the request only tells the server.
      .addCase(internalChatActions.markRead.pending, (state, action) => {
        const channel = state.channels[action.meta.arg];
        if (channel) channel.unreadCount = 0;
      })

      .addCase(internalChatActions.sendMessage.fulfilled, (state, action) => {
        appendMessage(state, action.payload);
        touchChannel(state, action.payload);
      })

      .addCase(internalChatActions.sendNudge.fulfilled, (state, action) => {
        appendMessage(state, action.payload);
        touchChannel(state, action.payload);
        state.nudgeAvailableAt[action.payload.channelId] =
          Date.now() + NUDGE_COOLDOWN_SECONDS * 1000;
      })
      .addCase(internalChatActions.sendNudge.rejected, (state, action) => {
        const retryAfter = action.payload?.retryAfter;
        if (retryAfter) state.nudgeAvailableAt[action.meta.arg] = Date.now() + retryAfter * 1000;
      })

      .addCase(internalChatActions.sendHelpRequest.fulfilled, (state, action) => {
        appendMessage(state, action.payload);
        touchChannel(state, action.payload);
      })

      .addCase(internalChatActions.claimHelpRequest.fulfilled, (state, action) => {
        replaceMessage(state, action.payload.message);
      })

      .addCase(internalChatActions.resolveHelpRequest.fulfilled, (state, action) => {
        replaceMessage(state, action.payload);
      });
  },
});

export const {
  setViewingChannel,
  messageReceived,
  messageUpdated,
  channelUpserted,
  nudgeCooldownStarted,
  resetInternalChat,
} = internalChatSlice.actions;

export default internalChatSlice.reducer;
