import { createEntityAdapter, createSlice, PayloadAction } from '@reduxjs/toolkit';

import { conversationRequestActions } from './conversationRequestActions';
import type { ConversationRequest } from './conversationRequestTypes';

export const conversationRequestAdapter = createEntityAdapter<ConversationRequest>();

const conversationRequestSlice = createSlice({
  name: 'conversationRequests',
  initialState: conversationRequestAdapter.getInitialState(),
  reducers: {
    /** Called for each `conversation_request.updated` event of the websocket. */
    upsertConversationRequest: (state, action: PayloadAction<ConversationRequest>) => {
      conversationRequestAdapter.upsertOne(state, action.payload);
    },
  },
  extraReducers: builder => {
    builder
      .addCase(conversationRequestActions.fetchMine.fulfilled, (state, { payload }) =>
        conversationRequestAdapter.upsertMany(state, payload),
      )
      .addCase(conversationRequestActions.fetchForConversation.fulfilled, (state, { payload }) =>
        conversationRequestAdapter.upsertMany(state, payload),
      )
      .addCase(conversationRequestActions.askParticipation.fulfilled, (state, { payload }) =>
        conversationRequestAdapter.upsertOne(state, payload),
      )
      .addCase(conversationRequestActions.respond.fulfilled, (state, { payload }) =>
        conversationRequestAdapter.upsertOne(state, payload),
      );
  },
});

export const { upsertConversationRequest } = conversationRequestSlice.actions;
export default conversationRequestSlice.reducer;
