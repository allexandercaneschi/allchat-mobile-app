import { useEffect, useMemo } from 'react';

import { useAppDispatch, useAppSelector } from '@/hooks';
import { selectUserId } from '@/store/auth/authSelectors';
import { conversationRequestActions } from '@/store/conversation-request/conversationRequestActions';
import { incomingOpenRequests } from '@/store/conversation-request/conversationRequestRules';
import { selectConversationRequests } from '@/store/conversation-request/conversationRequestSelectors';
import type { ConversationRequest } from '@/store/conversation-request/conversationRequestTypes';

/** Open requests waiting for the current agent's answer, oldest first. */
export const useIncomingRequests = (): ConversationRequest[] => {
  const requests = useAppSelector(selectConversationRequests);
  const userId = useAppSelector(selectUserId);

  // The clock only advances on re-render, so a request that expires while the screen stays
  // untouched is dropped at the next update; the server refuses answers to expired ones anyway.
  return useMemo(
    () => (userId === undefined ? [] : incomingOpenRequests(requests, userId, Date.now())),
    [requests, userId],
  );
};

/** Loads the agent's own requests; call once per account when the app is ready. */
export const useLoadMyRequests = (accountId: number | null | undefined) => {
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (accountId) {
      dispatch(conversationRequestActions.fetchMine());
    }
  }, [accountId, dispatch]);
};
