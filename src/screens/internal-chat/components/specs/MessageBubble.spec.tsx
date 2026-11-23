import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MessageBubble } from '../MessageBubble';
import {
  ANA,
  buildChannel,
  buildMessage,
  ME,
} from '@/store/internal-chat/specs/internalChatFixtures';
import type { InternalChatMessage } from '@/store/internal-chat/internalChatTypes';

jest.mock('@/theme/appearance', () => ({ useAppAppearance: () => 'light' }));
jest.mock('@/i18n', () => ({ t: (key: string) => key }));

const helpRequest = (overrides: Partial<InternalChatMessage> = {}) =>
  buildMessage({ id: 5, kind: 'help_request', content: 'preciso de ajuda', ...overrides });

const render = (message: InternalChatMessage, userId: number) => {
  const onClaim = jest.fn();
  const onResolve = jest.fn();
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(
      <MessageBubble
        message={message}
        channel={buildChannel()}
        userId={userId}
        onClaim={onClaim}
        onResolve={onResolve}
      />,
    );
  });
  const texts = () => JSON.stringify(tree.toJSON());
  const has = (testID: string) => tree.root.findAllByProps({ testID }).length > 0;
  const press = (testID: string) => {
    act(() => tree.root.findAllByProps({ testID })[0].props.onPress());
  };
  return { tree, onClaim, onResolve, texts, has, press };
};

describe('MessageBubble', () => {
  it('shows an open help request from a colleague with the Claim button only', () => {
    const message = helpRequest();
    const { texts, has, press, onClaim, onResolve } = render(message, ME.id);
    expect(texts()).toContain('INTERNAL_CHAT.HELP_REQUEST.STATUS_OPEN');
    expect(has('claim-5')).toBe(true);
    expect(has('resolve-5')).toBe(false);
    press('claim-5');
    expect(onClaim).toHaveBeenCalledWith(message);
    expect(onResolve).not.toHaveBeenCalled();
  });

  it('gives the author a Resolve button and no Claim button', () => {
    const message = helpRequest({ sender: ME });
    const { has, press, onResolve } = render(message, ME.id);
    expect(has('claim-5')).toBe(false);
    press('resolve-5');
    expect(onResolve).toHaveBeenCalledWith(message);
  });

  it('shows who took the request and lets them resolve it', () => {
    const { texts, has } = render(helpRequest({ sender: ME, claimedBy: ANA }), ANA.id);
    expect(texts()).toContain('INTERNAL_CHAT.HELP_REQUEST.STATUS_CLAIMED');
    expect(has('resolve-5')).toBe(true);
    expect(has('claim-5')).toBe(false);
  });

  it('shows no buttons for somebody else once it was taken, nor after it was resolved', () => {
    const taken = render(helpRequest({ sender: ME, claimedBy: ANA }), 99);
    expect(taken.has('resolve-5')).toBe(false);
    expect(taken.has('claim-5')).toBe(false);
    const done = render(helpRequest({ sender: ME, claimedBy: ANA, resolvedAt: 9 }), ME.id);
    expect(done.texts()).toContain('INTERNAL_CHAT.HELP_REQUEST.STATUS_RESOLVED');
    expect(done.has('resolve-5')).toBe(false);
  });

  it('marks an urgent text message', () => {
    const { tree } = render(buildMessage({ id: 8, urgent: true }), ME.id);
    expect(tree.root.findAllByProps({ testID: 'urgent-8' }).length).toBeGreaterThan(0);
  });

  it('draws a nudge as a system line, not as a bubble', () => {
    const { tree } = render(buildMessage({ id: 9, kind: 'nudge', content: '' }), ME.id);
    expect(tree.root.findAllByProps({ testID: 'nudge-9' }).length).toBeGreaterThan(0);
    expect(tree.root.findAllByProps({ testID: 'message-9' })).toHaveLength(0);
  });
});
