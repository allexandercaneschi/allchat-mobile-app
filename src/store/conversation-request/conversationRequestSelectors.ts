import { createSelector } from '@reduxjs/toolkit';

import type { RootState } from '@/store';

import { conversationRequestAdapter } from './conversationRequestSlice';

const adapterSelectors = conversationRequestAdapter.getSelectors(
  (state: RootState) => state.conversationRequests,
);

/** Every request known to this device. The rules in `conversationRequestRules` filter them. */
export const selectConversationRequests = createSelector(
  [adapterSelectors.selectAll],
  requests => requests,
);
