import { createAsyncThunk } from '@reduxjs/toolkit';

import { ConversationRequestService } from './conversationRequestService';
import type { ConversationRequest, ConversationRequestAnswer } from './conversationRequestTypes';

export const conversationRequestActions = {
  fetchMine: createAsyncThunk<ConversationRequest[], void>('conversationRequests/fetchMine', () =>
    ConversationRequestService.fetchMine(),
  ),
  fetchForConversation: createAsyncThunk<ConversationRequest[], number>(
    'conversationRequests/fetchForConversation',
    conversationId => ConversationRequestService.fetchForConversation(conversationId),
  ),
  askParticipation: createAsyncThunk<ConversationRequest, number>(
    'conversationRequests/askParticipation',
    conversationId => ConversationRequestService.askParticipation(conversationId),
  ),
  respond: createAsyncThunk<
    ConversationRequest,
    { requestId: number; answer: ConversationRequestAnswer }
  >('conversationRequests/respond', ({ requestId, answer }) =>
    ConversationRequestService.respond(requestId, answer),
  ),
};
