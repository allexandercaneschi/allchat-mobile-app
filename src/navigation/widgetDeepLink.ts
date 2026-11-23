/** Deep link used by the home-screen widget's "+" button. */
export const NEW_CONVERSATION_PATH = 'new-conversation';

/** True for `allchat://new-conversation`, with or without a leading slash or query string. */
export const isNewConversationPath = (path: string): boolean =>
  path.replace(/^\/+/, '').split(/[?#]/)[0].replace(/\/+$/, '') === NEW_CONVERSATION_PATH;
