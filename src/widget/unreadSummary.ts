import type { Conversation } from '@/types/Conversation';

/** The server returns 25 conversations per page; fewer than that means the last page. */
export const CONVERSATIONS_PAGE_SIZE = 25;
/** Upper bound of requests per refresh, so a huge inbox cannot drain battery or data. */
export const MAX_PAGES = 4;

export type UnreadSummary =
  | { status: 'signedOut' }
  | { status: 'error' }
  | {
      status: 'ok';
      /** Sum of unread messages across the agent's open conversations. */
      unread: number;
      /** Open conversations assigned to the agent that have unread messages. */
      conversations: number;
      /** True when MAX_PAGES was reached, so the real numbers may be higher. */
      capped: boolean;
    };

export type FetchPage = (page: number) => Promise<Pick<Conversation, 'unreadCount'>[]>;

/**
 * Adds up the unread messages of the agent's open conversations, page by page.
 * Only counts leave this function: the widget sits outside the biometric lock, so no
 * customer name or message text may ever reach it.
 */
export const computeUnreadSummary = async (fetchPage: FetchPage): Promise<UnreadSummary> => {
  let unread = 0;
  let conversations = 0;

  try {
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const items = await fetchPage(page);
      for (const item of items) {
        const count = Number(item.unreadCount) || 0;
        if (count > 0) {
          unread += count;
          conversations += 1;
        }
      }
      if (items.length < CONVERSATIONS_PAGE_SIZE) {
        return { status: 'ok', unread, conversations, capped: false };
      }
    }
  } catch {
    return { status: 'error' };
  }

  return { status: 'ok', unread, conversations, capped: true };
};
