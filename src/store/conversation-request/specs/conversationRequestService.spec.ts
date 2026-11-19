import { apiService } from '@/services/APIService';
import { ConversationRequestService } from '../conversationRequestService';

jest.mock('@/services/APIService', () => ({
  apiService: { get: jest.fn(), post: jest.fn() },
}));

const raw = {
  id: 1,
  request_type: 'participation',
  status: 'pending',
  expires_at: 2_000_000_000,
  created_at: 1_900_000_000,
  conversation_id: 10,
  inbox_id: 3,
  contact_name: 'Ana',
  requester: { id: 5, name: 'A' },
  target: { id: 9, name: 'B' },
};

describe('ConversationRequestService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists the requests of the agent in camelCase', async () => {
    (apiService.get as jest.Mock).mockResolvedValueOnce({ data: { payload: [raw] } });

    const [request] = await ConversationRequestService.fetchMine();

    expect(apiService.get).toHaveBeenCalledWith('conversation_requests');
    expect(request).toMatchObject({
      requestType: 'participation',
      conversationId: 10,
      expiresAt: 2_000_000_000,
    });
  });

  it('lists the requests of one conversation', async () => {
    (apiService.get as jest.Mock).mockResolvedValueOnce({ data: { payload: [raw] } });
    await ConversationRequestService.fetchForConversation(10);
    expect(apiService.get).toHaveBeenCalledWith('conversations/10/requests');
  });

  it('asks the owner for participation', async () => {
    (apiService.post as jest.Mock).mockResolvedValueOnce({ data: raw });
    const request = await ConversationRequestService.askParticipation(10);
    expect(apiService.post).toHaveBeenCalledWith('conversations/10/requests');
    expect(request.id).toBe(1);
  });

  it.each(['accept', 'decline', 'cancel'] as const)('answers a request with %s', async answer => {
    (apiService.post as jest.Mock).mockResolvedValueOnce({ data: raw });
    await ConversationRequestService.respond(1, answer);
    expect(apiService.post).toHaveBeenCalledWith(
      `conversation_requests/${answer}`.replace(
        'conversation_requests/',
        'conversation_requests/1/',
      ),
    );
  });
});
