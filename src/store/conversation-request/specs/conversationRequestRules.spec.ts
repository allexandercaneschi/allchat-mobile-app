import {
  hasAcceptedParticipation,
  incomingOpenRequests,
  isOpenRequest,
  openOutgoingRequest,
} from '../conversationRequestRules';
import type { ConversationRequest } from '../conversationRequestTypes';

const NOW = 1_700_000_000_000;
const inSeconds = (offset: number) => NOW / 1000 + offset;

const request = (overrides: Partial<ConversationRequest> = {}): ConversationRequest => ({
  id: 1,
  requestType: 'participation',
  status: 'pending',
  expiresAt: inSeconds(600),
  createdAt: inSeconds(-60),
  conversationId: 10,
  inboxId: 3,
  contactName: 'Ana',
  requester: { id: 5, name: 'Eu' },
  target: { id: 9, name: 'Dono' },
  ...overrides,
});

describe('isOpenRequest', () => {
  it('is open while pending and not expired', () => {
    expect(isOpenRequest(request(), NOW)).toBe(true);
  });

  it('is closed once expired, answered or cancelled', () => {
    expect(isOpenRequest(request({ expiresAt: inSeconds(-1) }), NOW)).toBe(false);
    expect(isOpenRequest(request({ status: 'accepted' }), NOW)).toBe(false);
    expect(isOpenRequest(request({ status: 'declined' }), NOW)).toBe(false);
    expect(isOpenRequest(request({ status: 'cancelled' }), NOW)).toBe(false);
  });
});

describe('incomingOpenRequests', () => {
  it('returns open requests aimed at the user, oldest first', () => {
    const newer = request({ id: 2, target: { id: 5, name: 'Eu' }, createdAt: inSeconds(-10) });
    const older = request({ id: 3, target: { id: 5, name: 'Eu' }, createdAt: inSeconds(-100) });
    const other = request({ id: 4, target: { id: 8, name: 'Outro' } });
    const expired = request({ id: 5, target: { id: 5, name: 'Eu' }, expiresAt: inSeconds(-5) });

    expect(incomingOpenRequests([newer, other, older, expired], 5, NOW).map(r => r.id)).toEqual([
      3, 2,
    ]);
  });
});

describe('openOutgoingRequest', () => {
  it('finds what the user already asked for in that conversation and type', () => {
    const mine = request();
    expect(openOutgoingRequest([mine], 10, 5, 'participation', NOW)).toBe(mine);
  });

  it('ignores other conversations, other requesters, other types and closed requests', () => {
    expect(
      openOutgoingRequest([request({ conversationId: 11 })], 10, 5, 'participation', NOW),
    ).toBe(undefined);
    expect(openOutgoingRequest([request()], 10, 6, 'participation', NOW)).toBeUndefined();
    expect(openOutgoingRequest([request()], 10, 5, 'transfer', NOW)).toBeUndefined();
    expect(
      openOutgoingRequest([request({ status: 'accepted' })], 10, 5, 'participation', NOW),
    ).toBeUndefined();
  });
});

describe('hasAcceptedParticipation', () => {
  const accepted = request({ status: 'accepted' });

  it('is true while the owner who accepted is still the owner', () => {
    expect(hasAcceptedParticipation([accepted], 10, 5, 9)).toBe(true);
  });

  it('stops counting when the conversation changed owner', () => {
    expect(hasAcceptedParticipation([accepted], 10, 5, 12)).toBe(false);
    expect(hasAcceptedParticipation([accepted], 10, 5, undefined)).toBe(false);
  });

  it('needs an accepted participation request of that user and conversation', () => {
    expect(hasAcceptedParticipation([request()], 10, 5, 9)).toBe(false);
    expect(hasAcceptedParticipation([accepted], 11, 5, 9)).toBe(false);
    expect(hasAcceptedParticipation([accepted], 10, 6, 9)).toBe(false);
    expect(
      hasAcceptedParticipation(
        [request({ status: 'accepted', requestType: 'transfer' })],
        10,
        5,
        9,
      ),
    ).toBe(false);
  });
});
