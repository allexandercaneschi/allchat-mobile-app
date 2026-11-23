export type ConversationRequestType = 'transfer' | 'participation';

export type ConversationRequestStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'cancelled';

export interface RequestParty {
  id: number;
  name: string;
  thumbnail?: string | null;
}

/**
 * ALLChat: a transfer (the owner hands the conversation over) or participation (an agent asks the
 * owner to let them reply) request. `conversationId` is the display id used everywhere in the app.
 */
export interface ConversationRequest {
  id: number;
  requestType: ConversationRequestType;
  status: ConversationRequestStatus;
  /** Unix seconds. */
  expiresAt: number;
  createdAt: number;
  conversationId: number;
  inboxId: number;
  contactName: string | null;
  requester: RequestParty;
  target: RequestParty;
}

export type ConversationRequestAnswer = 'accept' | 'decline' | 'cancel';
