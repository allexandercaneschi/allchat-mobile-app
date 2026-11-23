import { apiService, type AccountScopedRequestConfig } from '@/services/APIService';
import {
  transformInternalChatChannel,
  transformInternalChatMessage,
} from '@/store/internal-chat/internalChatTransforms';
import type {
  ClaimHelpRequestResult,
  InternalChatChannel,
  InternalChatMessage,
  InternalChatMessagesPage,
  InternalChatSearchPage,
  InternalChatUser,
  SendHelpRequestPayload,
} from '@/store/internal-chat/internalChatTypes';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Account-scoped paths: APIService prefixes them with `api/v1/accounts/:id/`.
const BASE = 'internal_chat';

// The nudge endpoint answers 429 (with `retry_after`) and a help request that was already taken
// answers 409. Both are expected answers, so the generic error toast stays quiet for them.
const QUIET_NUDGE: AccountScopedRequestConfig = { quietStatuses: [429] };
const QUIET_CLAIM: AccountScopedRequestConfig = { quietStatuses: [409] };
// A server without the internal chat (plain Chatwoot) answers 404: the app just hides the feature.
const QUIET_LIST: AccountScopedRequestConfig = { quietStatuses: [404] };

export class InternalChatService {
  static async getChannels(): Promise<InternalChatChannel[]> {
    const { data } = await apiService.get<{ payload: any[] }>(`${BASE}/channels`, QUIET_LIST);
    return data.payload.map(transformInternalChatChannel);
  }

  // Opens (or creates) the direct conversation with a colleague.
  static async openDirectChannel(userId: number): Promise<InternalChatChannel> {
    const { data } = await apiService.post<any>(`${BASE}/channels`, {
      kind: 'direct',
      user_id: userId,
    });
    return transformInternalChatChannel(data);
  }

  static async markRead(channelId: number): Promise<void> {
    await apiService.post(`${BASE}/channels/${channelId}/read`);
  }

  static async getMessages(
    channelId: number,
    beforeId?: number,
  ): Promise<InternalChatMessagesPage> {
    const { data } = await apiService.get<{ payload: any[]; meta: { has_more: boolean } }>(
      `${BASE}/channels/${channelId}/messages`,
      { params: beforeId ? { before_id: beforeId } : undefined },
    );
    return {
      payload: data.payload.map(transformInternalChatMessage),
      hasMore: !!data.meta?.has_more,
    };
  }

  static async sendMessage(
    channelId: number,
    payload: { content: string; urgent?: boolean },
  ): Promise<InternalChatMessage> {
    const { data } = await apiService.post<any>(`${BASE}/channels/${channelId}/messages`, {
      content: payload.content,
      urgent: payload.urgent === true,
    });
    return transformInternalChatMessage(data);
  }

  // "Call attention". Direct conversations only; the server answers 429 + `retry_after` (seconds).
  static async sendNudge(channelId: number): Promise<InternalChatMessage> {
    const { data } = await apiService.post<any>(
      `${BASE}/channels/${channelId}/messages`,
      { kind: 'nudge' },
      QUIET_NUDGE,
    );
    return transformInternalChatMessage(data);
  }

  static async sendHelpRequest(payload: SendHelpRequestPayload): Promise<InternalChatMessage> {
    const { data } = await apiService.post<any>(`${BASE}/help_requests`, {
      recipient_id: payload.recipientId,
      team_id: payload.teamId,
      content: payload.content,
      conversation_id: payload.conversationId,
    });
    return transformInternalChatMessage(data);
  }

  static async claimHelpRequest(
    channelId: number,
    messageId: number,
  ): Promise<ClaimHelpRequestResult> {
    const { data } = await apiService.post<any>(
      `${BASE}/channels/${channelId}/messages/${messageId}/claim`,
      undefined,
      QUIET_CLAIM,
    );
    return {
      message: transformInternalChatMessage(data.message),
      channelId: data.channel_id,
      joinedConversation: !!data.joined_conversation,
    };
  }

  static async resolveHelpRequest(channelId: number, messageId: number) {
    const { data } = await apiService.post<any>(
      `${BASE}/channels/${channelId}/messages/${messageId}/resolve`,
    );
    return transformInternalChatMessage(data);
  }

  // Searches the messages of the conversations the user takes part in (all, or only `channelId`).
  static async search(params: {
    query: string;
    channelId?: number;
    beforeId?: number;
  }): Promise<InternalChatSearchPage> {
    const { data } = await apiService.get<{ payload: any[]; meta: { has_more: boolean } }>(
      `${BASE}/search`,
      { params: { q: params.query, channel_id: params.channelId, before_id: params.beforeId } },
    );
    return {
      payload: data.payload.map(transformInternalChatMessage),
      hasMore: !!data.meta?.has_more,
    };
  }

  // Colleagues of the account (to start a conversation or ask for help).
  static async getAgents(): Promise<InternalChatUser[]> {
    const { data } = await apiService.get<any[]>('agents');
    return data.map(agent => ({
      id: agent.id,
      name: agent.name,
      availableName: agent.available_name,
      avatarUrl: agent.thumbnail || agent.avatar_url || null,
      thumbnail: agent.thumbnail || null,
      availabilityStatus: agent.availability_status,
    }));
  }
}

// Reads `retry_after` (seconds) from the 429 answer of the nudge endpoint.
export const getRetryAfterSeconds = (error: unknown): number | null => {
  const data = (error as { response?: { status?: number; data?: { retry_after?: number } } })
    ?.response;
  if (data?.status !== 429) return null;
  const seconds = Number(data.data?.retry_after);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
};

export const isAlreadyClaimedError = (error: unknown): boolean =>
  (error as { response?: { status?: number } })?.response?.status === 409;

export const isNotFoundError = (error: unknown): boolean =>
  (error as { response?: { status?: number } })?.response?.status === 404;
