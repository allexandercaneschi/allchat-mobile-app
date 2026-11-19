import { apiService, type AccountScopedRequestConfig } from '@/services/APIService';
import type {
  ContactLabelsAPIResponse,
  ContactLabelsPayload,
  UpdateContactLabelsPayload,
  ContactConversationAPIResponse,
  ContactConversationPayload,
  ContactListPayload,
  ContactListResult,
  ContactFormValues,
  ContactableInbox,
} from './contactTypes';
import type { Contact } from '@/types';
import { transformContact, transformConversation, transformInbox } from '@/utils/camelCaseKeys';

// Validation failures (e.g. a phone number that already belongs to another contact) carry a
// readable message from the server, so the form shows it instead of the generic error toast.
const VALIDATION_ERRORS: AccountScopedRequestConfig = { quietStatuses: [422] };

const toRequestBody = ({ name, phoneNumber, email }: ContactFormValues) => ({
  name,
  phone_number: phoneNumber,
  email,
});

// Rails answers 200 to a search/list with `payload` and `meta`; only search reports `has_more`.
// The plain list is paged by `meta.count` (the total), so derive it from the page size.
const CONTACTS_PER_PAGE = 15;

export class ContactService {
  static async getContactLabels(payload: ContactLabelsPayload) {
    const { contactId } = payload;
    const response = await apiService.get<ContactLabelsAPIResponse>(`contacts/${contactId}/labels`);
    return response.data;
  }

  static async updateContactLabels(
    payload: UpdateContactLabelsPayload,
  ): Promise<ContactLabelsAPIResponse> {
    const { contactId, labels } = payload;
    const response = await apiService.post<ContactLabelsAPIResponse>(
      `contacts/${contactId}/labels`,
      { labels },
    );
    return response.data;
  }

  static async getContactConversations(
    payload: ContactConversationPayload,
  ): Promise<ContactConversationAPIResponse> {
    const { contactId } = payload;
    const response = await apiService.get<ContactConversationAPIResponse>(
      `contacts/${contactId}/conversations`,
    );
    const transformedResponse = response.data.payload.map(transformConversation);
    return {
      payload: transformedResponse,
    };
  }

  static async listContacts({ page, query }: ContactListPayload): Promise<ContactListResult> {
    const search = query?.trim();
    if (search) {
      const response = await apiService.get<{
        payload: unknown[];
        meta: { has_more: boolean };
      }>('contacts/search', { params: { q: search, page, sort: 'name' } });
      return {
        contacts: response.data.payload.map(transformContact),
        hasMore: response.data.meta.has_more,
      };
    }
    const response = await apiService.get<{ payload: unknown[] }>('contacts', {
      params: { page, sort: 'name' },
    });
    const contacts = response.data.payload.map(transformContact);
    return { contacts, hasMore: contacts.length === CONTACTS_PER_PAGE };
  }

  static async createContact(values: ContactFormValues): Promise<Contact> {
    const response = await apiService.post<{ payload: { contact: unknown } }>(
      'contacts',
      toRequestBody(values),
      VALIDATION_ERRORS,
    );
    return transformContact(response.data.payload.contact);
  }

  static async updateContact(contactId: number, values: ContactFormValues): Promise<Contact> {
    const response = await apiService.put<{ payload: unknown }>(
      `contacts/${contactId}`,
      toRequestBody(values),
      VALIDATION_ERRORS,
    );
    return transformContact(response.data.payload);
  }

  static async getContact(contactId: number): Promise<Contact> {
    const response = await apiService.get<{ payload: unknown }>(`contacts/${contactId}`);
    return transformContact(response.data.payload);
  }

  static async getContactableInboxes(contactId: number): Promise<ContactableInbox[]> {
    const response = await apiService.get<{
      payload: { inbox: unknown; source_id: string }[];
    }>(`contacts/${contactId}/contactable_inboxes`);
    return response.data.payload.map(({ inbox, source_id }) => ({
      inbox: transformInbox(inbox),
      sourceId: source_id,
    }));
  }
}
