import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  getRetryAfterSeconds,
  InternalChatService,
  isAlreadyClaimedError,
  isNotFoundError,
} from '@/services/internal-chat/internalChatService';
import type {
  ClaimHelpRequestResult,
  InternalChatChannel,
  InternalChatMessage,
  InternalChatMessagesPage,
  SendHelpRequestPayload,
} from './internalChatTypes';

// Same value as `InternalChat::NUDGE_COOLDOWN` on the server (60 s). The server is the one that
// decides; when it answers 429 the `retry_after` it sends wins over this value.
export const NUDGE_COOLDOWN_SECONDS = 60;

// Payload of `fetchChannels` when the server does not have the internal chat (HTTP 404).
export const NOT_AVAILABLE = 'not_available';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : '');

export const internalChatActions = {
  fetchChannels: createAsyncThunk<InternalChatChannel[], void>(
    'internalChat/fetchChannels',
    async (_, { rejectWithValue }) => {
      try {
        return await InternalChatService.getChannels();
      } catch (error) {
        return rejectWithValue(isNotFoundError(error) ? NOT_AVAILABLE : errorMessage(error));
      }
    },
  ),

  fetchMessages: createAsyncThunk<
    InternalChatMessagesPage & { channelId: number; older: boolean },
    { channelId: number; beforeId?: number }
  >('internalChat/fetchMessages', async ({ channelId, beforeId }, { rejectWithValue }) => {
    try {
      const page = await InternalChatService.getMessages(channelId, beforeId);
      return { ...page, channelId, older: !!beforeId };
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  }),

  // Opens (or creates) the direct conversation with a colleague.
  openDirectChannel: createAsyncThunk<InternalChatChannel, number>(
    'internalChat/openDirectChannel',
    async (userId, { rejectWithValue }) => {
      try {
        return await InternalChatService.openDirectChannel(userId);
      } catch (error) {
        return rejectWithValue(errorMessage(error));
      }
    },
  ),

  markRead: createAsyncThunk<number, number>(
    'internalChat/markRead',
    async (channelId, { rejectWithValue }) => {
      try {
        await InternalChatService.markRead(channelId);
        return channelId;
      } catch (error) {
        return rejectWithValue(errorMessage(error));
      }
    },
  ),

  sendMessage: createAsyncThunk<
    InternalChatMessage,
    { channelId: number; content: string; urgent?: boolean }
  >('internalChat/sendMessage', async ({ channelId, content, urgent }, { rejectWithValue }) => {
    try {
      return await InternalChatService.sendMessage(channelId, { content, urgent });
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  }),

  // Rejects with `{ retryAfter }` when the server says the nudge is too soon (HTTP 429).
  sendNudge: createAsyncThunk<
    InternalChatMessage,
    number,
    { rejectValue: { retryAfter: number | null; message: string } }
  >('internalChat/sendNudge', async (channelId, { rejectWithValue }) => {
    try {
      return await InternalChatService.sendNudge(channelId);
    } catch (error) {
      return rejectWithValue({
        retryAfter: getRetryAfterSeconds(error),
        message: errorMessage(error),
      });
    }
  }),

  sendHelpRequest: createAsyncThunk<InternalChatMessage, SendHelpRequestPayload>(
    'internalChat/sendHelpRequest',
    async (payload, { rejectWithValue, dispatch }) => {
      try {
        const message = await InternalChatService.sendHelpRequest(payload);
        // The request may have created the direct conversation: bring the list up to date.
        dispatch(internalChatActions.fetchChannels());
        return message;
      } catch (error) {
        return rejectWithValue(errorMessage(error));
      }
    },
  ),

  // Rejects with `{ alreadyClaimed: true }` when somebody else took it first (HTTP 409).
  claimHelpRequest: createAsyncThunk<
    ClaimHelpRequestResult,
    { channelId: number; messageId: number },
    { rejectValue: { alreadyClaimed: boolean; message: string } }
  >('internalChat/claimHelpRequest', async ({ channelId, messageId }, { rejectWithValue }) => {
    try {
      return await InternalChatService.claimHelpRequest(channelId, messageId);
    } catch (error) {
      return rejectWithValue({
        alreadyClaimed: isAlreadyClaimedError(error),
        message: errorMessage(error),
      });
    }
  }),

  resolveHelpRequest: createAsyncThunk<
    InternalChatMessage,
    { channelId: number; messageId: number }
  >('internalChat/resolveHelpRequest', async ({ channelId, messageId }, { rejectWithValue }) => {
    try {
      return await InternalChatService.resolveHelpRequest(channelId, messageId);
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  }),
};
