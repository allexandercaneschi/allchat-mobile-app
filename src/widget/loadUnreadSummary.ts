import { persistor, store } from '@/store';
import { selectLoggedIn } from '@/store/auth/authSelectors';
import { selectLocale } from '@/store/settings/settingsSelectors';
import { ConversationService } from '@/store/conversation/conversationService';
import i18n from '@/i18n';

import { computeUnreadSummary, type UnreadSummary } from './unreadSummary';

const REHYDRATION_TIMEOUT_MS = 5000;

/** The widget can run before the UI does, so wait until the persisted state is loaded. */
const waitForRehydration = (): Promise<boolean> => {
  if (persistor.getState().bootstrapped) {
    return Promise.resolve(true);
  }
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      unsubscribe();
      resolve(false);
    }, REHYDRATION_TIMEOUT_MS);
    const unsubscribe = persistor.subscribe(() => {
      if (persistor.getState().bootstrapped) {
        clearTimeout(timer);
        unsubscribe();
        resolve(true);
      }
    });
  });
};

export interface WidgetData {
  summary: UnreadSummary;
  locale: string;
}

export const loadWidgetData = async (): Promise<WidgetData> => {
  const ready = await waitForRehydration();
  const state = store.getState();
  const locale = selectLocale(state) || 'en';
  i18n.locale = locale;

  if (!ready) {
    return { summary: { status: 'error' }, locale };
  }
  if (!selectLoggedIn(state)) {
    return { summary: { status: 'signedOut' }, locale };
  }

  const summary = await computeUnreadSummary(async page => {
    const { conversations } = await ConversationService.getConversations({
      page,
      status: 'open',
      assigneeType: 'me',
      sortBy: 'latest',
    });
    return conversations;
  });
  return { summary, locale };
};
