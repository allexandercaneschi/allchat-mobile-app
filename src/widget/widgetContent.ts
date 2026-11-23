import i18n from '@/i18n';

import type { UnreadSummary } from './unreadSummary';

export interface WidgetContent {
  /** Large figure shown on the left; null when there is no figure to show. */
  count: string | null;
  headline: string;
  subtitle: string | null;
  /** The "+" button only makes sense when someone is signed in. */
  showNewConversation: boolean;
  /** True when there is something waiting for the agent, to highlight the figure. */
  highlight: boolean;
}

export const buildWidgetContent = (summary: UnreadSummary): WidgetContent => {
  if (summary.status === 'signedOut') {
    return {
      count: null,
      headline: i18n.t('WIDGET.SIGNED_OUT'),
      subtitle: null,
      showNewConversation: false,
      highlight: false,
    };
  }

  if (summary.status === 'error') {
    return {
      count: null,
      headline: i18n.t('WIDGET.ERROR'),
      subtitle: i18n.t('WIDGET.ERROR_HINT'),
      showNewConversation: true,
      highlight: false,
    };
  }

  const { unread, conversations, capped } = summary;
  if (unread === 0) {
    return {
      count: '0',
      headline: i18n.t('WIDGET.ALL_CAUGHT_UP'),
      subtitle: null,
      showNewConversation: true,
      highlight: false,
    };
  }

  return {
    count: capped ? `${unread}+` : String(unread),
    headline: i18n.t('WIDGET.UNREAD', { count: unread }),
    subtitle: i18n.t('WIDGET.IN_CONVERSATIONS', { count: conversations }),
    showNewConversation: true,
    highlight: true,
  };
};
