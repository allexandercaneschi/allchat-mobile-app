import reducer, { upsertConversationRequest } from '../conversationRequestSlice';
import { conversationRequestActions } from '../conversationRequestActions';
import type { ConversationRequest } from '../conversationRequestTypes';

const request = (overrides: Partial<ConversationRequest> = {}): ConversationRequest => ({
  id: 1,
  requestType: 'transfer',
  status: 'pending',
  expiresAt: 2_000_000_000,
  createdAt: 1_900_000_000,
  conversationId: 10,
  inboxId: 3,
  contactName: 'Ana',
  requester: { id: 5, name: 'A' },
  target: { id: 9, name: 'B' },
  ...overrides,
});

describe('conversationRequestSlice', () => {
  const empty = reducer(undefined, { type: 'init' });

  it('replaces a request when the websocket reports its answer', () => {
    const pending = reducer(empty, upsertConversationRequest(request()));
    const accepted = reducer(pending, upsertConversationRequest(request({ status: 'accepted' })));

    expect(Object.keys(accepted.entities)).toEqual(['1']);
    expect(accepted.entities[1]?.status).toBe('accepted');
  });

  it('stores what the API returns for a conversation and for the agent', () => {
    let state = reducer(
      empty,
      conversationRequestActions.fetchForConversation.fulfilled([request({ id: 1 })], 'r', 10),
    );
    state = reducer(
      state,
      conversationRequestActions.fetchMine.fulfilled([request({ id: 2 })], 'r', undefined),
    );

    expect(state.ids).toEqual([1, 2]);
  });

  it('stores the request just sent and the answer to a request', () => {
    let state = reducer(
      empty,
      conversationRequestActions.askParticipation.fulfilled(
        request({ id: 4, requestType: 'participation' }),
        'r',
        10,
      ),
    );
    state = reducer(
      state,
      conversationRequestActions.respond.fulfilled(
        request({ id: 4, requestType: 'participation', status: 'declined' }),
        'r',
        { requestId: 4, answer: 'decline' },
      ),
    );

    expect(state.entities[4]?.status).toBe('declined');
  });
});
