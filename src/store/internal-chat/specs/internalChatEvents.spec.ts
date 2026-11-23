import { AppState, Vibration } from 'react-native';
import { configureStore } from '@reduxjs/toolkit';
import internalChatReducer, { channelUpserted, setViewingChannel } from '../internalChatSlice';
import {
  INTERNAL_CHAT_MESSAGE_CREATED,
  isAttentionMessage,
  onInternalChatMessageCreated,
  onInternalChatMessageUpdated,
} from '../internalChatEvents';
import { InternalChatService } from '@/services/internal-chat/internalChatService';
import { showToast } from '@/utils/toastUtils';
import { ANA, buildChannel, buildMessage, ME } from './internalChatFixtures';

let mockStore: ReturnType<typeof createTestStore>;

const createTestStore = () =>
  configureStore({
    reducer: {
      internalChat: internalChatReducer,
      auth: (state = { user: { id: 1 } }) => state,
    },
  });

jest.mock('@/store', () => ({
  get store() {
    return mockStore;
  },
}));
jest.mock('@/utils/toastUtils', () => ({ showToast: jest.fn() }));
jest.mock('@/services/internal-chat/internalChatService');

// The server sends snake_case.
const wire = (overrides: Record<string, unknown> = {}) => ({
  id: 10,
  channel_id: 100,
  kind: 'text',
  content: 'olá',
  urgent: false,
  mentioned_user_ids: [],
  sender: { id: ANA.id, name: ANA.name },
  recipient_id: null,
  conversation_id: null,
  claimed_by: null,
  claimed_at: null,
  resolved_at: null,
  created_at: 1000,
  account_id: 1,
  ...overrides,
});

const setAppState = (value: string) =>
  Object.defineProperty(AppState, 'currentState', { value, configurable: true, writable: true });

const service = InternalChatService as jest.Mocked<typeof InternalChatService>;

describe('internal chat websocket events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore = createTestStore();
    mockStore.dispatch(channelUpserted(buildChannel()));
    jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});
    setAppState('active');
    service.markRead.mockResolvedValue();
    service.getChannels.mockResolvedValue([buildChannel({ id: 300, unreadCount: 1 })]);
    (showToast as jest.Mock).mockClear();
  });

  afterEach(() => jest.restoreAllMocks());

  it('uses the event names the server sends', () => {
    expect(INTERNAL_CHAT_MESSAGE_CREATED).toBe('internal_chat.message.created');
  });

  it('adds the message and counts it as unread', () => {
    onInternalChatMessageCreated(wire());
    const { internalChat } = mockStore.getState();
    expect(internalChat.messages[100]).toHaveLength(1);
    expect(internalChat.messages[100][0].channelId).toBe(100);
    expect(internalChat.channels[100].unreadCount).toBe(1);
    expect(service.markRead).not.toHaveBeenCalled();
  });

  it('reads the message right away when the conversation is on screen', () => {
    mockStore.dispatch(setViewingChannel(100));
    onInternalChatMessageCreated(wire());
    expect(mockStore.getState().internalChat.channels[100].unreadCount).toBe(0);
    expect(service.markRead).toHaveBeenCalledWith(100);
  });

  it('does not mark as read nor alert for my own message', () => {
    mockStore.dispatch(setViewingChannel(100));
    onInternalChatMessageCreated(wire({ sender: { id: ME.id, name: ME.name }, kind: 'nudge' }));
    expect(service.markRead).not.toHaveBeenCalled();
    expect(Vibration.vibrate).not.toHaveBeenCalled();
  });

  it('refetches the channels when the conversation is not known yet', () => {
    onInternalChatMessageCreated(wire({ channel_id: 300 }));
    expect(service.getChannels).toHaveBeenCalledTimes(1);
  });

  it('calls attention in the app for a nudge and for an urgent message', () => {
    onInternalChatMessageCreated(wire({ id: 11, kind: 'nudge', content: '' }));
    onInternalChatMessageCreated(wire({ id: 12, urgent: true }));
    expect(Vibration.vibrate).toHaveBeenCalledTimes(2);
    expect(showToast).toHaveBeenCalledTimes(2);
  });

  it('does not call attention for a normal message or while the app is in the background', () => {
    onInternalChatMessageCreated(wire());
    setAppState('background');
    onInternalChatMessageCreated(wire({ id: 13, urgent: true }));
    expect(Vibration.vibrate).not.toHaveBeenCalled();
  });

  it('applies message.updated (help request taken)', () => {
    onInternalChatMessageCreated(wire({ kind: 'help_request' }));
    onInternalChatMessageUpdated(
      wire({ kind: 'help_request', claimed_by: { id: ME.id, name: ME.name }, claimed_at: 2000 }),
    );
    const [message] = mockStore.getState().internalChat.messages[100];
    expect(message.claimedBy?.id).toBe(ME.id);
    expect(message.claimedAt).toBe(2000);
  });

  describe('isAttentionMessage', () => {
    it('is true for nudge, urgent and mention only', () => {
      expect(isAttentionMessage(buildMessage({ kind: 'nudge' }), 1)).toBe(true);
      expect(isAttentionMessage(buildMessage({ urgent: true }), 1)).toBe(true);
      expect(isAttentionMessage(buildMessage({ mentionedUserIds: [1] }), 1)).toBe(true);
      expect(isAttentionMessage(buildMessage({ mentionedUserIds: [2] }), 1)).toBe(false);
      expect(isAttentionMessage(buildMessage(), 1)).toBe(false);
    });
  });
});
