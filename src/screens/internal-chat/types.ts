// Routes of the internal chat. The list lives in a tab ("InternalChat"); the other screens are on
// the root stack (like ChatScreen), so the tab bar does not cover the message field.
export type InternalChatRootParamList = {
  InternalChatConversation: { channelId: number };
  InternalChatNewChat: undefined;
  // Prefilled when the help request is started from a conversation.
  InternalChatHelpRequest: { recipientId?: number; teamId?: number } | undefined;
};
