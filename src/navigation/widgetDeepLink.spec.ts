import { isNewConversationPath } from './widgetDeepLink';

describe('isNewConversationPath', () => {
  it.each([
    'new-conversation',
    '/new-conversation',
    '//new-conversation/',
    '/new-conversation?a=1',
  ])('accepts %s', path => {
    expect(isNewConversationPath(path)).toBe(true);
  });

  it.each([
    '',
    '/',
    '/new-conversations',
    '/app/accounts/1/conversations/2',
    '/x/new-conversation',
  ])('rejects %s', path => {
    expect(isNewConversationPath(path)).toBe(false);
  });
});
