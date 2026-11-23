import { Contact, Conversation } from '@/types';
import type { Inbox } from '@/types/Inbox';
export interface ContactLabelsAPIResponse {
  payload: string[];
}

export interface ContactLabelsPayload {
  contactId: number;
}

export interface UpdateContactLabelsPayload {
  contactId: number;
  labels: string[];
}

export interface ContactConversationPayload {
  contactId: number;
}

export interface ContactConversationAPIResponse {
  payload: Conversation[];
}

export interface ContactListPayload {
  page: number;
  /** Text typed in the search box; empty lists every contact by name. */
  query?: string;
}

export interface ContactListResult {
  contacts: Contact[];
  hasMore: boolean;
}

/** Fields the contact form can send. `phoneNumber` must already be E.164 (see `normalizePhone`). */
export interface ContactFormValues {
  name: string;
  phoneNumber: string | null;
  email: string | null;
}

/** An inbox through which the contact can be messaged, with the identifier used on that channel. */
export interface ContactableInbox {
  inbox: Inbox;
  sourceId: string;
}
