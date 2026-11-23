import type { ConversationMeta } from '@/types';
import {
  canReply,
  getOwnerId,
  getOwnershipState,
  isLockedState,
  isManagerPermissions,
} from '../conversationOwnership';

const base = { userId: 5, isManager: false, hasAcceptedParticipation: false };

describe('getOwnershipState', () => {
  it('locks an unassigned conversation for everyone, managers included', () => {
    expect(getOwnershipState({ ...base, assigneeId: undefined })).toBe('unassigned');
    expect(getOwnershipState({ ...base, assigneeId: undefined, isManager: true })).toBe(
      'unassigned',
    );
  });

  it('recognizes the owner, even when also a manager', () => {
    expect(getOwnershipState({ ...base, assigneeId: 5 })).toBe('owner');
    expect(getOwnershipState({ ...base, assigneeId: 5, isManager: true })).toBe('owner');
  });

  it("lets a manager into someone else's conversation", () => {
    expect(getOwnershipState({ ...base, assigneeId: 9, isManager: true })).toBe('manager');
  });

  it('lets an agent in only after the owner accepted the participation', () => {
    expect(getOwnershipState({ ...base, assigneeId: 9 })).toBe('other');
    expect(getOwnershipState({ ...base, assigneeId: 9, hasAcceptedParticipation: true })).toBe(
      'participant',
    );
  });
});

describe('canReply', () => {
  it.each([
    ['owner', true],
    ['manager', true],
    ['participant', true],
    ['other', false],
    ['unassigned', false],
  ] as const)('%s -> %s', (state, expected) => {
    expect(canReply(state)).toBe(expected);
  });
});

describe('isLockedState', () => {
  it('flags exactly the states that replace the reply box', () => {
    expect(isLockedState('unassigned')).toBe(true);
    expect(isLockedState('other')).toBe(true);
    expect(isLockedState('owner')).toBe(false);
    expect(isLockedState('manager')).toBe(false);
    expect(isLockedState('participant')).toBe(false);
  });
});

describe('getOwnerId', () => {
  const meta = (extra: Partial<ConversationMeta>) => ({ ...extra }) as ConversationMeta;

  it('returns the agent who holds the conversation', () => {
    expect(getOwnerId(meta({ assignee: { id: 7 } as ConversationMeta['assignee'] }))).toBe(7);
    expect(
      getOwnerId(
        meta({ assignee: { id: 7 } as ConversationMeta['assignee'], assigneeType: 'User' }),
      ),
    ).toBe(7);
  });

  it('ignores a bot, whose id can equal a user id', () => {
    expect(
      getOwnerId(
        meta({ assignee: { id: 7 } as ConversationMeta['assignee'], assigneeType: 'AgentBot' }),
      ),
    ).toBeUndefined();
  });

  it('returns nothing without an assignee or meta', () => {
    expect(getOwnerId(meta({}))).toBeUndefined();
    expect(getOwnerId(undefined)).toBeUndefined();
  });
});

describe('isManagerPermissions', () => {
  it('is true for administrators and supervisors only', () => {
    expect(isManagerPermissions(['administrator'])).toBe(true);
    expect(isManagerPermissions(['agent', 'supervisor'])).toBe(true);
    expect(isManagerPermissions(['agent'])).toBe(false);
  });
});
