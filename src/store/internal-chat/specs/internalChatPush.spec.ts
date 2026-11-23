import { AppState, Vibration } from 'react-native';
import { configureStore } from '@reduxjs/toolkit';
import internalChatReducer, { setViewingChannel } from '../internalChatSlice';
import { handleInternalChatPush } from '../internalChatPush';
import { onInternalChatMessageCreated } from '../internalChatEvents';
import { resetAttentionMemory } from '../internalChatAttention';
import { InternalChatService } from '@/services/internal-chat/internalChatService';
import { showToast } from '@/utils/toastUtils';
import { buildChannel } from './internalChatFixtures';
import { channelUpserted } from '../internalChatSlice';

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

const service = InternalChatService as jest.Mocked<typeof InternalChatService>;

// What InternalChat::PushNotificationService sends: the FCM `data.payload` is a JSON string.
const push = (overrides: Record<string, unknown> = {}, title = 'Ana chamou sua atenção') => ({
  notification: { title },
  data: {
    payload: JSON.stringify({
      data: {
        notification: {
          notification_type: 'internal_message',
          primary_actor_type: 'InternalChat::Message',
          primary_actor_id: 77,
          primary_actor: { id: 77, channel_id: 100 },
          urgent: true,
          account_id: 1,
          ...overrides,
        },
      },
    }),
  },
});

const setAppState = (value: string) =>
  Object.defineProperty(AppState, 'currentState', { value, configurable: true, writable: true });

describe('handleInternalChatPush', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAttentionMemory();
    mockStore = createTestStore();
    mockStore.dispatch(channelUpserted(buildChannel()));
    jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});
    setAppState('active');
    service.getChannels.mockResolvedValue([buildChannel()]);
  });

  afterEach(() => jest.restoreAllMocks());

  it('ignores pushes that are not internal chat messages', () => {
    const conversationPush = push({ notification_type: 'conversation_creation' });
    expect(handleInternalChatPush(conversationPush)).toBe(false);
    expect(handleInternalChatPush({ data: {} })).toBe(false);
    expect(service.getChannels).not.toHaveBeenCalled();
  });

  it('refreshes the conversations for any internal chat push', () => {
    expect(handleInternalChatPush(push({ urgent: false }))).toBe(true);
    expect(service.getChannels).toHaveBeenCalledTimes(1);
    expect(Vibration.vibrate).not.toHaveBeenCalled();
  });

  it('calls attention for an urgent push while the app is open', () => {
    handleInternalChatPush(push());
    expect(Vibration.vibrate).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith({ message: 'Ana chamou sua atenção' });
  });

  it('does not call attention when the conversation is on screen or the app is not active', () => {
    mockStore.dispatch(setViewingChannel(100));
    handleInternalChatPush(push());
    expect(Vibration.vibrate).not.toHaveBeenCalled();
    mockStore.dispatch(setViewingChannel(null));
    setAppState('background');
    handleInternalChatPush(push());
    expect(Vibration.vibrate).not.toHaveBeenCalled();
  });

  it('alerts the same message once when the websocket and the push both bring it', () => {
    onInternalChatMessageCreated({
      id: 77,
      channel_id: 100,
      kind: 'nudge',
      content: '',
      urgent: false,
      mentioned_user_ids: [],
      sender: { id: 2, name: 'Ana' },
      created_at: 10,
      account_id: 1,
    });
    handleInternalChatPush(push());
    expect(Vibration.vibrate).toHaveBeenCalledTimes(1);
  });
});
