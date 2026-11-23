import reducer, {
  channelUpserted,
  initialState,
  messageReceived,
  messageUpdated,
  resetInternalChat,
  setViewingChannel,
} from '../internalChatSlice';
import { internalChatActions, NUDGE_COOLDOWN_SECONDS } from '../internalChatActions';
import {
  selectInternalChatChannelList,
  selectInternalChatMessages,
  selectInternalChatUnreadTotal,
} from '../internalChatSelectors';
import type { RootState } from '@/store';
import type { InternalChatState } from '../internalChatTypes';
import { ANA, buildChannel, buildMessage, ME } from './internalChatFixtures';

const withChannel = (overrides = {}): InternalChatState =>
  reducer(initialState, channelUpserted(buildChannel(overrides)));

const asRoot = (internalChat: InternalChatState) => ({ internalChat }) as unknown as RootState;

describe('internalChatSlice', () => {
  describe('messageReceived', () => {
    it('adds the message, moves the channel up and counts it as unread', () => {
      const state = reducer(
        withChannel(),
        messageReceived({ message: buildMessage(), userId: ME.id }),
      );
      expect(state.messages[100]).toHaveLength(1);
      expect(state.channels[100].unreadCount).toBe(1);
      expect(state.channels[100].lastMessage?.id).toBe(10);
      expect(state.channels[100].lastActivityAt).toBe(1000);
    });

    it('does not count my own message as unread', () => {
      const message = buildMessage({ sender: ME });
      const state = reducer(withChannel(), messageReceived({ message, userId: ME.id }));
      expect(state.channels[100].unreadCount).toBe(0);
    });

    it('does not count it as unread while the conversation is on screen', () => {
      let state = withChannel();
      state = reducer(state, setViewingChannel(100));
      state = reducer(state, messageReceived({ message: buildMessage(), userId: ME.id }));
      expect(state.channels[100].unreadCount).toBe(0);
      expect(state.messages[100]).toHaveLength(1);
    });

    it('ignores a message it already has (HTTP answer and websocket both deliver it)', () => {
      let state = withChannel();
      state = reducer(state, messageReceived({ message: buildMessage(), userId: ME.id }));
      state = reducer(state, messageReceived({ message: buildMessage(), userId: ME.id }));
      expect(state.messages[100]).toHaveLength(1);
      expect(state.channels[100].unreadCount).toBe(1);
    });

    it('keeps the thread ordered by id', () => {
      let state = withChannel();
      state = reducer(state, messageReceived({ message: buildMessage({ id: 12 }), userId: ME.id }));
      state = reducer(state, messageReceived({ message: buildMessage({ id: 11 }), userId: ME.id }));
      expect(state.messages[100].map(message => message.id)).toEqual([11, 12]);
    });

    it('keeps the message of a channel it does not know yet (the list is refetched)', () => {
      const state = reducer(
        initialState,
        messageReceived({ message: buildMessage(), userId: ME.id }),
      );
      expect(state.messages[100]).toHaveLength(1);
      expect(state.channels[100]).toBeUndefined();
    });
  });

  describe('messageUpdated', () => {
    it('replaces the message in the thread and in the channel preview', () => {
      let state = withChannel();
      const open = buildMessage({ kind: 'help_request' });
      state = reducer(state, messageReceived({ message: open, userId: ME.id }));
      const claimed = { ...open, claimedBy: ME, claimedAt: 2000 };
      state = reducer(state, messageUpdated(claimed));
      expect(state.messages[100][0].claimedBy).toEqual(ME);
      expect(state.channels[100].lastMessage?.claimedBy).toEqual(ME);
    });
  });

  describe('viewing channel', () => {
    it('zeroes the unread counter of the conversation that is opened', () => {
      const state = reducer(withChannel({ unreadCount: 4 }), setViewingChannel(100));
      expect(state.channels[100].unreadCount).toBe(0);
      expect(state.viewingChannelId).toBe(100);
    });

    it('keeps the counter at zero when the channel list is refreshed meanwhile', () => {
      let state = reducer(withChannel({ unreadCount: 4 }), setViewingChannel(100));
      state = reducer(
        state,
        internalChatActions.fetchChannels.fulfilled([buildChannel({ unreadCount: 2 })], 'req'),
      );
      expect(state.channels[100].unreadCount).toBe(0);
    });
  });

  describe('thunks', () => {
    it('marking a channel as read zeroes the counter before the request ends', () => {
      const state = reducer(
        withChannel({ unreadCount: 3 }),
        internalChatActions.markRead.pending('req', 100),
      );
      expect(state.channels[100].unreadCount).toBe(0);
    });

    it('stores the cooldown the server sends with a 429', () => {
      jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      const state = reducer(
        withChannel(),
        internalChatActions.sendNudge.rejected(null, 'req', 100, { retryAfter: 42, message: '' }),
      );
      expect(state.nudgeAvailableAt[100]).toBe(1_000_000 + 42_000);
      jest.restoreAllMocks();
    });

    it('starts the default cooldown after a nudge was sent', () => {
      jest.spyOn(Date, 'now').mockReturnValue(2_000_000);
      const nudge = buildMessage({ id: 20, kind: 'nudge', sender: ME, content: '' });
      const state = reducer(
        withChannel(),
        internalChatActions.sendNudge.fulfilled(nudge, 'req', 100),
      );
      expect(state.nudgeAvailableAt[100]).toBe(2_000_000 + NUDGE_COOLDOWN_SECONDS * 1000);
      expect(state.messages[100]).toHaveLength(1);
      jest.restoreAllMocks();
    });

    it('ignores a failed nudge without retry_after', () => {
      const state = reducer(
        withChannel(),
        internalChatActions.sendNudge.rejected(null, 'req', 100, { retryAfter: null, message: '' }),
      );
      expect(state.nudgeAvailableAt[100]).toBeUndefined();
    });

    it('applies the claim and the resolve answers to the message', () => {
      let state = withChannel();
      const request = buildMessage({ kind: 'help_request', sender: ME });
      state = reducer(state, messageReceived({ message: request, userId: ME.id }));
      state = reducer(
        state,
        internalChatActions.claimHelpRequest.fulfilled(
          { message: { ...request, claimedBy: ANA }, channelId: 200, joinedConversation: false },
          'req',
          { channelId: 100, messageId: 10 },
        ),
      );
      expect(state.messages[100][0].claimedBy).toEqual(ANA);
      state = reducer(
        state,
        internalChatActions.resolveHelpRequest.fulfilled(
          { ...request, claimedBy: ANA, resolvedAt: 3000 },
          'req',
          { channelId: 100, messageId: 10 },
        ),
      );
      expect(state.messages[100][0].resolvedAt).toBe(3000);
    });

    it('merges the first page with the messages that arrived through the websocket', () => {
      let state = withChannel();
      state = reducer(state, messageReceived({ message: buildMessage({ id: 12 }), userId: ME.id }));
      state = reducer(
        state,
        internalChatActions.fetchMessages.fulfilled(
          {
            channelId: 100,
            older: false,
            hasMore: true,
            payload: [buildMessage({ id: 10 }), buildMessage({ id: 11 })],
          },
          'req',
          { channelId: 100 },
        ),
      );
      expect(state.messages[100].map(message => message.id)).toEqual([10, 11, 12]);
      expect(state.hasMoreMessages[100]).toBe(true);
    });

    it('puts older pages before the thread', () => {
      let state = withChannel();
      state = reducer(state, messageReceived({ message: buildMessage({ id: 20 }), userId: ME.id }));
      state = reducer(
        state,
        internalChatActions.fetchMessages.fulfilled(
          { channelId: 100, older: true, hasMore: false, payload: [buildMessage({ id: 5 })] },
          'req',
          { channelId: 100, beforeId: 20 },
        ),
      );
      expect(state.messages[100].map(message => message.id)).toEqual([5, 20]);
      expect(state.hasMoreMessages[100]).toBe(false);
    });
  });

  it('forgets everything on reset', () => {
    const state = reducer(withChannel({ unreadCount: 2 }), resetInternalChat());
    expect(state).toEqual(initialState);
  });

  describe('selectors', () => {
    it('sorts the channels by activity and sums the unread counters', () => {
      let state = reducer(
        initialState,
        channelUpserted(buildChannel({ id: 1, lastActivityAt: 10, unreadCount: 2 })),
      );
      state = reducer(
        state,
        channelUpserted(buildChannel({ id: 2, lastActivityAt: 30, unreadCount: 1 })),
      );
      state = reducer(state, channelUpserted(buildChannel({ id: 3, lastActivityAt: 20 })));
      const root = asRoot(state);
      expect(selectInternalChatChannelList(root).map(channel => channel.id)).toEqual([2, 3, 1]);
      expect(selectInternalChatUnreadTotal(root)).toBe(3);
      expect(selectInternalChatMessages(root, 1)).toEqual([]);
    });
  });
});
