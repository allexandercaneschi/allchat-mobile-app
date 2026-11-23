import camelcaseKeys from 'camelcase-keys';

import { apiService } from '@/services/APIService';
import type { ConversationRequest, ConversationRequestAnswer } from './conversationRequestTypes';

export const transformConversationRequest = (raw: unknown): ConversationRequest =>
  camelcaseKeys(raw as Record<string, unknown>, { deep: true }) as unknown as ConversationRequest;

export class ConversationRequestService {
  /** Open requests where the current agent is the requester or the target. */
  static async fetchMine(): Promise<ConversationRequest[]> {
    const response = await apiService.get<{ payload: unknown[] }>('conversation_requests');
    return response.data.payload.map(transformConversationRequest);
  }

  /** Open requests of one conversation, plus the participation already accepted by its owner. */
  static async fetchForConversation(conversationId: number): Promise<ConversationRequest[]> {
    const response = await apiService.get<{ payload: unknown[] }>(
      `conversations/${conversationId}/requests`,
    );
    return response.data.payload.map(transformConversationRequest);
  }

  static async askParticipation(conversationId: number): Promise<ConversationRequest> {
    const response = await apiService.post<unknown>(`conversations/${conversationId}/requests`);
    return transformConversationRequest(response.data);
  }

  static async respond(
    requestId: number,
    answer: ConversationRequestAnswer,
  ): Promise<ConversationRequest> {
    const response = await apiService.post<unknown>(`conversation_requests/${requestId}/${answer}`);
    return transformConversationRequest(response.data);
  }
}
