import { apiService } from '@/services/APIService';
import {
  getRetryAfterSeconds,
  InternalChatService,
  isAlreadyClaimedError,
} from '../internalChatService';

jest.mock('@/services/APIService', () => ({
  apiService: { get: jest.fn(), post: jest.fn() },
}));

const api = apiService as unknown as { get: jest.Mock; post: jest.Mock };

const wireMessage = {
  id: 7,
  channel_id: 3,
  kind: 'help_request',
  content: 'ajuda',
  urgent: false,
  mentioned_user_ids: [],
  sender: { id: 1, name: 'Eu' },
  recipient_id: 2,
  conversation_id: null,
  claimed_by: null,
  claimed_at: null,
  resolved_at: null,
  created_at: 10,
};

describe('InternalChatService', () => {
  beforeEach(() => jest.resetAllMocks());

  it('lists the channels and converts them to camelCase', async () => {
    api.get.mockResolvedValue({
      data: {
        payload: [
          {
            id: 3,
            kind: 'company_room',
            team: null,
            name: 'ALL',
            posting_policy: 'admins_only',
            can_post: false,
            user: null,
            unread_count: 2,
            last_message: wireMessage,
            last_activity_at: 10,
          },
        ],
      },
    });
    const [channel] = await InternalChatService.getChannels();
    expect(api.get).toHaveBeenCalledWith('internal_chat/channels');
    expect(channel).toMatchObject({ postingPolicy: 'admins_only', canPost: false, unreadCount: 2 });
    expect(channel.lastMessage?.channelId).toBe(3);
  });

  it('opens a direct conversation with user_id', async () => {
    api.post.mockResolvedValue({ data: { id: 5, kind: 'direct', unread_count: 0 } });
    await InternalChatService.openDirectChannel(9);
    expect(api.post).toHaveBeenCalledWith('internal_chat/channels', { kind: 'direct', user_id: 9 });
  });

  it('marks as read through channels/:id/read', async () => {
    api.post.mockResolvedValue({ data: {} });
    await InternalChatService.markRead(5);
    expect(api.post).toHaveBeenCalledWith('internal_chat/channels/5/read');
  });

  it('pages the messages with before_id', async () => {
    api.get.mockResolvedValue({ data: { payload: [wireMessage], meta: { has_more: true } } });
    const page = await InternalChatService.getMessages(3, 50);
    expect(api.get).toHaveBeenCalledWith('internal_chat/channels/3/messages', {
      params: { before_id: 50 },
    });
    expect(page.hasMore).toBe(true);
    expect(page.payload[0].recipientId).toBe(2);
  });

  it('sends text with the urgent flag', async () => {
    api.post.mockResolvedValue({ data: wireMessage });
    await InternalChatService.sendMessage(3, { content: 'oi', urgent: true });
    expect(api.post).toHaveBeenCalledWith('internal_chat/channels/3/messages', {
      content: 'oi',
      urgent: true,
    });
  });

  it('sends the nudge with kind nudge and keeps the 429 answer quiet', async () => {
    api.post.mockResolvedValue({ data: { ...wireMessage, kind: 'nudge' } });
    await InternalChatService.sendNudge(3);
    expect(api.post).toHaveBeenCalledWith(
      'internal_chat/channels/3/messages',
      { kind: 'nudge' },
      { quietStatuses: [429] },
    );
  });

  it('sends a help request to one person or to a team', async () => {
    api.post.mockResolvedValue({ data: wireMessage });
    await InternalChatService.sendHelpRequest({ recipientId: 2, content: 'ajuda' });
    expect(api.post).toHaveBeenLastCalledWith('internal_chat/help_requests', {
      recipient_id: 2,
      team_id: undefined,
      content: 'ajuda',
      conversation_id: undefined,
    });
    await InternalChatService.sendHelpRequest({ teamId: 4, content: 'ajuda' });
    expect(api.post).toHaveBeenLastCalledWith('internal_chat/help_requests', {
      recipient_id: undefined,
      team_id: 4,
      content: 'ajuda',
      conversation_id: undefined,
    });
  });

  it('claims and resolves a help request', async () => {
    api.post.mockResolvedValueOnce({
      data: { message: wireMessage, channel_id: 8, joined_conversation: true },
    });
    const claimed = await InternalChatService.claimHelpRequest(3, 7);
    expect(api.post).toHaveBeenLastCalledWith(
      'internal_chat/channels/3/messages/7/claim',
      undefined,
      { quietStatuses: [409] },
    );
    expect(claimed).toMatchObject({ channelId: 8, joinedConversation: true });

    api.post.mockResolvedValueOnce({ data: wireMessage });
    await InternalChatService.resolveHelpRequest(3, 7);
    expect(api.post).toHaveBeenLastCalledWith('internal_chat/channels/3/messages/7/resolve');
  });

  it('searches with q, channel_id and before_id', async () => {
    api.get.mockResolvedValue({ data: { payload: [], meta: { has_more: false } } });
    await InternalChatService.search({ query: 'ajuda', channelId: 3, beforeId: 9 });
    expect(api.get).toHaveBeenCalledWith('internal_chat/search', {
      params: { q: 'ajuda', channel_id: 3, before_id: 9 },
    });
  });

  it('lists the colleagues from the agents endpoint', async () => {
    api.get.mockResolvedValue({
      data: [{ id: 2, name: 'Ana', thumbnail: 'x.png', availability_status: 'online' }],
    });
    const [agent] = await InternalChatService.getAgents();
    expect(api.get).toHaveBeenCalledWith('agents');
    expect(agent).toMatchObject({ id: 2, name: 'Ana', avatarUrl: 'x.png' });
  });
});

describe('error helpers', () => {
  it('reads retry_after only from a 429', () => {
    expect(getRetryAfterSeconds({ response: { status: 429, data: { retry_after: 37 } } })).toBe(37);
    expect(getRetryAfterSeconds({ response: { status: 429, data: {} } })).toBeNull();
    expect(
      getRetryAfterSeconds({ response: { status: 500, data: { retry_after: 5 } } }),
    ).toBeNull();
    expect(getRetryAfterSeconds(new Error('x'))).toBeNull();
  });

  it('recognises a help request that was already taken (409)', () => {
    expect(isAlreadyClaimedError({ response: { status: 409 } })).toBe(true);
    expect(isAlreadyClaimedError({ response: { status: 422 } })).toBe(false);
  });
});
