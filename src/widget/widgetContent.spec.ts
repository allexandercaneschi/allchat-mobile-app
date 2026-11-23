import i18n from '@/i18n';

import { buildWidgetContent } from './widgetContent';

describe('buildWidgetContent', () => {
  beforeEach(() => {
    i18n.locale = 'pt_BR';
  });

  it('highlights the unread total with the number of conversations', () => {
    expect(
      buildWidgetContent({ status: 'ok', unread: 7, conversations: 3, capped: false }),
    ).toEqual({
      count: '7',
      headline: '7 mensagens não lidas',
      subtitle: 'em 3 conversas',
      showNewConversation: true,
      highlight: true,
    });
  });

  it('uses the singular forms', () => {
    const content = buildWidgetContent({
      status: 'ok',
      unread: 1,
      conversations: 1,
      capped: false,
    });

    expect(content.headline).toBe('1 mensagem não lida');
    expect(content.subtitle).toBe('em 1 conversa');
  });

  it('marks a capped total with a plus sign', () => {
    const content = buildWidgetContent({
      status: 'ok',
      unread: 100,
      conversations: 100,
      capped: true,
    });

    expect(content.count).toBe('100+');
  });

  it('shows an all-caught-up state without highlight', () => {
    expect(
      buildWidgetContent({ status: 'ok', unread: 0, conversations: 0, capped: false }),
    ).toEqual({
      count: '0',
      headline: 'Tudo em dia',
      subtitle: null,
      showNewConversation: true,
      highlight: false,
    });
  });

  it('hides the new-conversation button when signed out', () => {
    const content = buildWidgetContent({ status: 'signedOut' });

    expect(content.showNewConversation).toBe(false);
    expect(content.count).toBeNull();
  });

  it('keeps the button on error so the agent can still open the app', () => {
    const content = buildWidgetContent({ status: 'error' });

    expect(content.headline).toBe('Não foi possível atualizar');
    expect(content.showNewConversation).toBe(true);
  });

  it('never carries customer data: only counts and fixed texts', () => {
    const content = buildWidgetContent({
      status: 'ok',
      unread: 2,
      conversations: 1,
      capped: false,
    });

    expect(Object.keys(content).sort()).toEqual(
      ['count', 'headline', 'highlight', 'showNewConversation', 'subtitle'].sort(),
    );
  });
});
