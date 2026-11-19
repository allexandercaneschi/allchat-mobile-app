import { computeUnreadSummary, CONVERSATIONS_PAGE_SIZE, MAX_PAGES } from './unreadSummary';

const page = (counts: number[]) => counts.map(unreadCount => ({ unreadCount }));
const fullPage = (unreadCount: number) => page(Array(CONVERSATIONS_PAGE_SIZE).fill(unreadCount));

describe('computeUnreadSummary', () => {
  it('sums unread messages and counts only conversations with unread messages', async () => {
    const fetchPage = jest.fn().mockResolvedValue(page([3, 0, 2, 0]));

    await expect(computeUnreadSummary(fetchPage)).resolves.toEqual({
      status: 'ok',
      unread: 5,
      conversations: 2,
      capped: false,
    });
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(1);
  });

  it('reports zero when there are no conversations', async () => {
    await expect(computeUnreadSummary(async () => [])).resolves.toEqual({
      status: 'ok',
      unread: 0,
      conversations: 0,
      capped: false,
    });
  });

  it('keeps paging while pages are full and stops at the first short page', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(fullPage(1))
      .mockResolvedValueOnce(page([4]));

    await expect(computeUnreadSummary(fetchPage)).resolves.toEqual({
      status: 'ok',
      unread: CONVERSATIONS_PAGE_SIZE + 4,
      conversations: CONVERSATIONS_PAGE_SIZE + 1,
      capped: false,
    });
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2);
  });

  it('flags the result as capped after MAX_PAGES full pages', async () => {
    const fetchPage = jest.fn().mockResolvedValue(fullPage(1));

    const summary = await computeUnreadSummary(fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(MAX_PAGES);
    expect(summary).toEqual({
      status: 'ok',
      unread: CONVERSATIONS_PAGE_SIZE * MAX_PAGES,
      conversations: CONVERSATIONS_PAGE_SIZE * MAX_PAGES,
      capped: true,
    });
  });

  it('ignores missing or invalid unread counts', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValue([{ unreadCount: undefined }, { unreadCount: 'x' }, { unreadCount: 2 }]);

    await expect(computeUnreadSummary(fetchPage)).resolves.toMatchObject({
      unread: 2,
      conversations: 1,
    });
  });

  it('returns an error state when a request fails, discarding partial totals', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(fullPage(1))
      .mockRejectedValueOnce(new Error('offline'));

    await expect(computeUnreadSummary(fetchPage)).resolves.toEqual({ status: 'error' });
  });
});
