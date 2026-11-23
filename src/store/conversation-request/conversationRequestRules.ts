import type { ConversationRequest, ConversationRequestType } from './conversationRequestTypes';

// Pure rules shared by the selectors and the screens. They take the clock as a parameter so
// expiry can be tested.

export const isOpenRequest = (request: ConversationRequest, now: number): boolean =>
  request.status === 'pending' && request.expiresAt * 1000 > now;

/** Requests waiting for the current agent's answer, oldest first. */
export const incomingOpenRequests = (
  requests: ConversationRequest[],
  userId: number,
  now: number,
): ConversationRequest[] =>
  requests
    .filter(request => request.target.id === userId && isOpenRequest(request, now))
    .sort((a, b) => a.createdAt - b.createdAt);

/** The request the agent already sent for this conversation and that is still waiting. */
export const openOutgoingRequest = (
  requests: ConversationRequest[],
  conversationId: number,
  userId: number,
  requestType: ConversationRequestType,
  now: number,
): ConversationRequest | undefined =>
  requests.find(
    request =>
      request.conversationId === conversationId &&
      request.requester.id === userId &&
      request.requestType === requestType &&
      isOpenRequest(request, now),
  );

/** True when the current owner accepted this agent's participation request. */
export const hasAcceptedParticipation = (
  requests: ConversationRequest[],
  conversationId: number,
  userId: number,
  assigneeId: number | undefined,
): boolean =>
  assigneeId !== undefined &&
  requests.some(
    request =>
      request.conversationId === conversationId &&
      request.requestType === 'participation' &&
      request.status === 'accepted' &&
      request.requester.id === userId &&
      request.target.id === assigneeId,
  );
