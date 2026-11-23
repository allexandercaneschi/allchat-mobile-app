import { useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '@/hooks';
import { selectUser, selectUserId } from '@/store/auth/authSelectors';
import { conversationRequestActions } from '@/store/conversation-request/conversationRequestActions';
import {
  hasAcceptedParticipation,
  openOutgoingRequest,
} from '@/store/conversation-request/conversationRequestRules';
import { selectConversationRequests } from '@/store/conversation-request/conversationRequestSelectors';
import { selectConversationById } from '@/store/conversation/conversationSelectors';
import { getUserPermissions } from '@/utils/permissionUtils';

import {
  getOwnerId,
  isLockedState,
  getOwnershipState,
  isManagerPermissions,
} from './conversationOwnership';

/**
 * Who may reply in a conversation, following the server's ownership rules. While the conversation
 * is not loaded yet it reports `canReply: true`, so the reply box keeps handling that case.
 */
export const useConversationOwnership = (conversationId: number) => {
  const dispatch = useAppDispatch();
  const conversation = useAppSelector(state => selectConversationById(state, conversationId));
  const user = useAppSelector(selectUser);
  const userId = useAppSelector(selectUserId);
  const requests = useAppSelector(selectConversationRequests);

  // The accepted participation and any pending request only arrive through this call.
  useEffect(() => {
    dispatch(conversationRequestActions.fetchForConversation(conversationId));
  }, [conversationId, dispatch]);

  if (!conversation || userId === undefined) {
    return { canReply: true as const };
  }

  const ownerId = getOwnerId(conversation.meta);
  const isManager = isManagerPermissions(getUserPermissions(user, user?.account_id));
  const state = getOwnershipState({
    assigneeId: ownerId,
    userId,
    isManager,
    hasAcceptedParticipation: hasAcceptedParticipation(requests, conversationId, userId, ownerId),
  });

  if (!isLockedState(state)) {
    return { canReply: true as const };
  }
  return {
    canReply: false as const,
    state,
    ownerName: conversation.meta?.assignee?.name ?? '',
    pendingParticipation: openOutgoingRequest(
      requests,
      conversationId,
      userId,
      'participation',
      Date.now(),
    ),
  };
};
