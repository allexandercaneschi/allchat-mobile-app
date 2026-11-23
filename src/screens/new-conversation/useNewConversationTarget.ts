import { useEffect, useState } from 'react';

import { ContactService } from '@/store/contact/contactService';
import type { ContactableInbox } from '@/store/contact/contactTypes';
import type { Contact } from '@/types';

type TargetState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; contact: Contact; inboxes: ContactableInbox[] };

/** Loads the contact and the inboxes it can be messaged through, once a contact is chosen. */
export const useNewConversationTarget = (contactId: number | null): TargetState => {
  const [state, setState] = useState<TargetState>({ status: 'idle' });

  useEffect(() => {
    if (contactId === null) {
      setState({ status: 'idle' });
      return;
    }
    let cancelled = false;
    setState({ status: 'loading' });
    Promise.all([
      ContactService.getContact(contactId),
      ContactService.getContactableInboxes(contactId),
    ])
      .then(([contact, inboxes]) => {
        if (!cancelled) {
          setState({ status: 'ready', contact, inboxes });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: 'error' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  return state;
};
