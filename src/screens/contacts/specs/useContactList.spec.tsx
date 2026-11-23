import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import { ContactService } from '@/store/contact/contactService';
import { useContactList } from '../useContactList';

jest.mock('@/store/contact/contactService', () => ({
  ContactService: { listContacts: jest.fn() },
}));

const listContacts = ContactService.listContacts as jest.Mock;
const contact = (id: number, name = `Contato ${id}`) => ({
  id,
  name,
  phoneNumber: '+553133334444',
});

type HookResult = ReturnType<typeof useContactList>;

const renderList = async (initialQuery = '') => {
  const result: { current: HookResult } = { current: undefined as unknown as HookResult };
  const Probe = ({ query }: { query: string }) => {
    result.current = useContactList(query);
    return null;
  };
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = TestRenderer.create(<Probe query={initialQuery} />);
  });
  const setQuery = async (query: string) => {
    await act(async () => tree.update(<Probe query={query} />));
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
  };
  return { result, setQuery };
};

describe('useContactList', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    listContacts.mockReset();
  });
  afterEach(() => jest.useRealTimers());

  it('loads the first page and appends the next one without duplicates', async () => {
    listContacts
      .mockResolvedValueOnce({ contacts: [contact(1), contact(2)], hasMore: true })
      .mockResolvedValueOnce({ contacts: [contact(2), contact(3)], hasMore: false });

    const { result } = await renderList();
    expect(result.current.contacts.map(c => c.id)).toEqual([1, 2]);

    await act(async () => result.current.loadMore());
    expect(listContacts).toHaveBeenLastCalledWith({ page: 2, query: '' });
    expect(result.current.contacts.map(c => c.id)).toEqual([1, 2, 3]);

    await act(async () => result.current.loadMore());
    expect(listContacts).toHaveBeenCalledTimes(2);
  });

  it('searches only after typing pauses and returns to page 1', async () => {
    listContacts.mockResolvedValue({ contacts: [contact(1)], hasMore: false });
    const { setQuery } = await renderList();

    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    listContacts.mockClear();
    await setQuery('ana');

    expect(listContacts).toHaveBeenCalledTimes(1);
    expect(listContacts).toHaveBeenCalledWith({ page: 1, query: 'ana' });
  });

  it('ignores an answer that arrives after a newer search', async () => {
    let resolveOld!: (value: unknown) => void;
    listContacts
      .mockResolvedValueOnce({ contacts: [], hasMore: false })
      .mockReturnValueOnce(new Promise(resolve => (resolveOld = resolve)))
      .mockResolvedValueOnce({ contacts: [contact(9, 'Ana')], hasMore: false });

    const { result, setQuery } = await renderList();
    await setQuery('a');
    await setQuery('ana');
    await act(async () => resolveOld({ contacts: [contact(1, 'Antigo')], hasMore: false }));

    expect(result.current.contacts.map(c => c.name)).toEqual(['Ana']);
  });

  it('reports an error and keeps what was already listed', async () => {
    listContacts
      .mockResolvedValueOnce({ contacts: [contact(1)], hasMore: false })
      .mockRejectedValueOnce(new Error('offline'));

    const { result } = await renderList();
    await act(async () => result.current.refresh());

    expect(result.current.hasError).toBe(true);
    expect(result.current.contacts).toHaveLength(1);
  });
});
