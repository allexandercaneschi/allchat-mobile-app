import { useCallback, useEffect, useRef, useState } from 'react';

import { ContactService } from '@/store/contact/contactService';
import type { Contact } from '@/types';

const SEARCH_DEBOUNCE_MS = 300;

type Status = 'loading' | 'loadingMore' | 'idle' | 'error';

type ListState = {
  contacts: Contact[];
  page: number;
  hasMore: boolean;
  status: Status;
};

const initialState: ListState = { contacts: [], page: 1, hasMore: false, status: 'loading' };

const appendUnique = (current: Contact[], next: Contact[]) => {
  const known = new Set(current.map(contact => contact.id));
  return [...current, ...next.filter(contact => !known.has(contact.id))];
};

/**
 * Contacts of ALLChat (never the phone's address book), listed by name and filtered by the
 * search text once typing pauses. A request that finishes after a newer one started is ignored,
 * so a slow answer to an old search can't overwrite the current list.
 */
export const useContactList = (query: string) => {
  const [state, setState] = useState<ListState>(initialState);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const latestRequest = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchPage = useCallback(
    async (page: number, mode: 'replace' | 'append') => {
      const requestId = ++latestRequest.current;
      setState(current => ({ ...current, status: mode === 'append' ? 'loadingMore' : 'loading' }));
      try {
        const { contacts, hasMore } = await ContactService.listContacts({
          page,
          query: debouncedQuery,
        });
        if (requestId !== latestRequest.current) {
          return;
        }
        setState(current => ({
          contacts: mode === 'append' ? appendUnique(current.contacts, contacts) : contacts,
          page,
          hasMore,
          status: 'idle',
        }));
      } catch {
        if (requestId === latestRequest.current) {
          setState(current => ({ ...current, status: 'error' }));
        }
      }
    },
    [debouncedQuery],
  );

  useEffect(() => {
    fetchPage(1, 'replace');
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (state.status === 'idle' && state.hasMore) {
      fetchPage(state.page + 1, 'append');
    }
  }, [fetchPage, state.hasMore, state.page, state.status]);

  const refresh = useCallback(() => fetchPage(1, 'replace'), [fetchPage]);

  return {
    contacts: state.contacts,
    isLoading: state.status === 'loading',
    isLoadingMore: state.status === 'loadingMore',
    hasError: state.status === 'error',
    loadMore,
    refresh,
  };
};
