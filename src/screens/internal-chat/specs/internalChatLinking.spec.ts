import { transformNotification } from '@/utils/camelCaseKeys';
import { findConversationLinkFromPush, findNotificationFromFCM } from '@/utils/pushUtils';
import {
  buildInternalChatLink,
  buildInternalChatState,
  findInternalChatLinkFromPush,
  parseInternalChatPath,
} from '../internalChatLinking';

// What InternalChat::PushNotificationService#fcm_data sends (`data.payload` is a JSON string).
const fcmMessage = (notification: Record<string, unknown>) => ({
  data: { payload: JSON.stringify({ data: { notification } }) },
});

const internalPush = {
  notification_type: 'internal_message',
  primary_actor_type: 'InternalChat::Message',
  primary_actor_id: 77,
  primary_actor: { id: 77, channel_id: 45 },
  urgent: true,
  account_id: 3,
};

describe('internal chat deep links', () => {
  const installationUrl = 'https://chat.example.com';

  it('builds the link of a conversation', () => {
    expect(buildInternalChatLink(installationUrl, 3, 45)).toBe(
      'https://chat.example.com/app/accounts/3/internal_chat/45',
    );
  });

  it('finds the conversation of an internal chat push', () => {
    const notification = transformNotification(
      findNotificationFromFCM({ message: fcmMessage(internalPush) }),
    );
    expect(findInternalChatLinkFromPush({ notification, installationUrl })).toBe(
      'https://chat.example.com/app/accounts/3/internal_chat/45',
    );
  });

  it('falls back to the active account when the push has none', () => {
    const { account_id: _ignored, ...withoutAccount } = internalPush;
    const notification = transformNotification(withoutAccount);
    expect(
      findInternalChatLinkFromPush({ notification, installationUrl, currentAccountId: 9 }),
    ).toBe('https://chat.example.com/app/accounts/9/internal_chat/45');
  });

  it('ignores pushes that are not internal messages or have no channel', () => {
    const conversationPush = transformNotification({
      notification_type: 'conversation_creation',
      primary_actor_type: 'Conversation',
      primary_actor_id: 1,
      primary_actor: { id: 1 },
    });
    expect(
      findInternalChatLinkFromPush({ notification: conversationPush, installationUrl }),
    ).toBeUndefined();
    const noChannel = transformNotification({ ...internalPush, primary_actor: { id: 77 } });
    expect(
      findInternalChatLinkFromPush({ notification: noChannel, installationUrl }),
    ).toBeUndefined();
  });

  it('is what findConversationLinkFromPush returns for an internal push', () => {
    const notification = transformNotification(internalPush);
    expect(
      findConversationLinkFromPush({ notification, installationUrl, currentAccountId: 3 }),
    ).toBe('https://chat.example.com/app/accounts/3/internal_chat/45');
  });

  it('parses the path of the link', () => {
    expect(parseInternalChatPath('/app/accounts/3/internal_chat/45')).toEqual({
      accountId: 3,
      channelId: 45,
    });
    expect(parseInternalChatPath('app/accounts/3/internal_chat/45?x=1')).toEqual({
      accountId: 3,
      channelId: 45,
    });
    expect(parseInternalChatPath('/app/accounts/3/conversations/45')).toBeNull();
    expect(parseInternalChatPath('/app/accounts/3/internal_chat/abc')).toBeNull();
  });

  it('opens the team chat tab with the conversation on top', () => {
    expect(buildInternalChatState(45)).toEqual({
      routes: [
        { name: 'Tab', state: { routes: [{ name: 'InternalChat' }] } },
        { name: 'InternalChatConversation', params: { channelId: 45 } },
      ],
    });
  });
});
