import type { ConversationMeta } from '@/types';

// Client-side mirror of the server's Conversations::OwnershipRules (which has the final word):
// nobody replies to an unassigned conversation; the owner, administrators/supervisors and agents
// whose participation request the owner accepted do.

export type OwnershipState = 'unassigned' | 'owner' | 'manager' | 'participant' | 'other';

type OwnershipInput = {
  /** Id of the agent who owns the conversation, if a person (not a bot) does. */
  assigneeId: number | undefined;
  userId: number;
  isManager: boolean;
  hasAcceptedParticipation: boolean;
};

/** The person who owns the conversation. A bot may hold it, and bot ids can equal user ids. */
export const getOwnerId = (meta: ConversationMeta | undefined): number | undefined => {
  if (!meta?.assignee || meta.assigneeType === 'AgentBot') {
    return undefined;
  }
  return meta.assignee.id;
};

export const getOwnershipState = ({
  assigneeId,
  userId,
  isManager,
  hasAcceptedParticipation,
}: OwnershipInput): OwnershipState => {
  if (assigneeId === undefined) {
    return 'unassigned';
  }
  if (assigneeId === userId) {
    return 'owner';
  }
  if (isManager) {
    return 'manager';
  }
  return hasAcceptedParticipation ? 'participant' : 'other';
};

/** The states in which the reply box is replaced by the ownership bar. */
export type LockedState = Extract<OwnershipState, 'unassigned' | 'other'>;

export const isLockedState = (state: OwnershipState): state is LockedState =>
  state === 'unassigned' || state === 'other';

export const canReply = (state: OwnershipState): boolean => !isLockedState(state);

/** Administrators and supervisors assign directly and reply in anyone's conversation. */
export const isManagerPermissions = (permissions: string[]): boolean =>
  permissions.includes('administrator') || permissions.includes('supervisor');
