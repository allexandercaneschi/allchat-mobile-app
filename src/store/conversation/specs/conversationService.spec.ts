import { ConversationService } from '../conversationService';
import { apiService } from '@/services/APIService';
import { conversation, conversationListResponse } from './conversationMockData';
import { transformConversation, transformConversationListMeta } from '@/utils/camelCaseKeys';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('@/i18n', () => ({
  t: (key: string) => key,
}));

jest.mock('@/utils/toastUtils', () => ({
  showToast: jest.fn(),
}));

jest.mock('@/services/APIService', () => ({
  apiService: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('ConversationService', () => {
  it('should fetch all conversations', async () => {
    (apiService.get as jest.Mock).mockResolvedValueOnce({
      data: conversationListResponse,
    });

    const result = await ConversationService.getConversations({
      status: 'open',
      assigneeType: 'all',
      page: 1,
      sortBy: 'latest',
    });
    expect(apiService.get).toHaveBeenCalledWith('conversations', {
      params: {
        inbox_id: null,
        assignee_type: 'all',
        status: 'open',
        page: 1,
        sort_by: 'latest',
      },
    });
    expect(result).toEqual({
      conversations: conversationListResponse.data.payload.map(transformConversation),
      meta: transformConversationListMeta(conversationListResponse.data.meta),
    });
  });

  it('creates a conversation assigned to the creator with the first message', async () => {
    (apiService.post as jest.Mock).mockResolvedValueOnce({ data: { id: 42 } });

    const displayId = await ConversationService.createConversation({
      contactId: 7,
      inboxId: 3,
      sourceId: '553199998888',
      message: 'Olá!',
      assigneeId: 9,
    });

    expect(apiService.post).toHaveBeenCalledWith('conversations', {
      contact_id: 7,
      inbox_id: 3,
      source_id: '553199998888',
      assignee_id: 9,
      message: { content: 'Olá!' },
    });
    expect(displayId).toBe(42);
  });

  describe('assignConversation', () => {
    it('reports an immediate assignment', async () => {
      (apiService.post as jest.Mock).mockResolvedValueOnce({ status: 200, data: { id: 9 } });

      const result = await ConversationService.assignConversation({
        conversationId: 4,
        assigneeId: 9,
      });

      expect(apiService.post).toHaveBeenCalledWith('conversations/4/assignments', {
        assignee_id: 9,
        team_id: undefined,
      });
      expect(result).toEqual({ kind: 'assigned' });
    });

    it('releases the conversation with a null assignee', async () => {
      (apiService.post as jest.Mock).mockResolvedValueOnce({ status: 200, data: null });

      await ConversationService.assignConversation({ conversationId: 4, assigneeId: null });

      expect(apiService.post).toHaveBeenCalledWith('conversations/4/assignments', {
        assignee_id: null,
        team_id: undefined,
      });
    });

    it('reports the transfer request the server created instead of a transfer', async () => {
      (apiService.post as jest.Mock).mockResolvedValueOnce({
        status: 202,
        data: {
          conversation_request: {
            id: 3,
            request_type: 'transfer',
            status: 'pending',
            expires_at: 2_000_000_000,
            created_at: 1_900_000_000,
            conversation_id: 4,
            inbox_id: 1,
            contact_name: 'Ana',
            requester: { id: 1, name: 'A' },
            target: { id: 9, name: 'B' },
          },
        },
      });

      const result = await ConversationService.assignConversation({
        conversationId: 4,
        assigneeId: 9,
      });

      expect(result).toMatchObject({
        kind: 'transferRequested',
        request: { id: 3, requestType: 'transfer', conversationId: 4 },
      });
    });
  });

  it('should fetch conversation', async () => {
    (apiService.get as jest.Mock).mockResolvedValueOnce({
      data: conversation,
    });

    const result = await ConversationService.fetchConversation(1);
    expect(result).toEqual({
      conversation: transformConversation(conversation),
    });

    expect(apiService.get).toHaveBeenCalledWith('conversations/1');
  });

  it('should toggle conversation status', async () => {
    (apiService.post as jest.Mock).mockResolvedValueOnce({
      data: {
        payload: {
          conversation_id: 1,
          current_status: 'resolved',
          snoozed_until: null,
        },
      },
    });

    const result = await ConversationService.toggleConversationStatus({
      conversationId: 1,
      payload: { status: 'resolved', snoozed_until: null },
    });
    expect(apiService.post).toHaveBeenCalledWith('conversations/1/toggle_status', {
      status: 'resolved',
      snoozed_until: null,
    });

    expect(result).toEqual({
      conversationId: 1,
      currentStatus: 'resolved',
      snoozedUntil: null,
    });
  });

  it('merges new custom attributes into the server copy before saving', async () => {
    (apiService.get as jest.Mock).mockResolvedValueOnce({
      data: { custom_attributes: { plan_2b: 'gold', 'order.id': '99', ticket_ref: '' } },
    });
    (apiService.post as jest.Mock).mockResolvedValueOnce({
      data: { custom_attributes: { plan_2b: 'gold', 'order.id': '99', ticket_ref: 'TKT-1' } },
    });

    const result = await ConversationService.updateCustomAttributes({
      conversationId: 1,
      customAttributes: { ticket_ref: 'TKT-1' },
    });

    expect(apiService.get).toHaveBeenCalledWith('conversations/1');
    expect(apiService.post).toHaveBeenCalledWith('conversations/1/custom_attributes', {
      custom_attributes: { plan_2b: 'gold', 'order.id': '99', ticket_ref: 'TKT-1' },
    });
    expect(result).toEqual({
      conversationId: 1,
      customAttributes: { plan2B: 'gold', orderId: '99', ticketRef: 'TKT-1' },
    });
  });

  it('should mute conversation', async () => {
    await ConversationService.muteConversation({ conversationId: 1 });

    expect(apiService.post).toHaveBeenCalledWith('conversations/1/mute');
  });

  it('should retry a message', async () => {
    (apiService.post as jest.Mock).mockResolvedValueOnce({ data: { id: 12 } });

    const result = await ConversationService.retryMessage({ conversationId: 1, messageId: 12 });

    expect(apiService.post).toHaveBeenCalledWith('conversations/1/messages/12/retry');
    expect(result).toEqual({ id: 12 });
  });
});
