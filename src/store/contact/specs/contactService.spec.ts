import { ContactService } from '../contactService';
import { apiService } from '@/services/APIService';
import { mockContactLabelsResponse } from './contactMockData';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('@/i18n', () => ({
  t: (key: string) => key,
}));

jest.mock('@/utils/toastUtils', () => ({
  showToast: jest.fn(),
}));

jest.mock('@/services/APIService', () => ({
  apiService: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('ContactService', () => {
  it('should get contact labels', async () => {
    (apiService.get as jest.Mock).mockResolvedValueOnce(mockContactLabelsResponse);

    const result = await ContactService.getContactLabels({ contactId: 1 });
    expect(apiService.get).toHaveBeenCalledWith('contacts/1/labels');
    expect(result).toEqual(mockContactLabelsResponse.data);
  });

  describe('contacts list, create and update', () => {
    const rawContact = { id: 7, name: 'Ana', phone_number: '+553199998888', email: null };

    it('lists contacts by name and reports a next page when the page is full', async () => {
      const page = Array.from({ length: 15 }, (_, id) => ({ ...rawContact, id }));
      (apiService.get as jest.Mock).mockResolvedValueOnce({ data: { payload: page } });

      const result = await ContactService.listContacts({ page: 2 });

      expect(apiService.get).toHaveBeenCalledWith('contacts', {
        params: { page: 2, sort: 'name' },
      });
      expect(result.hasMore).toBe(true);
      expect(result.contacts[0].phoneNumber).toBe('+553199998888');
    });

    it('stops paging on a partial page', async () => {
      (apiService.get as jest.Mock).mockResolvedValueOnce({ data: { payload: [rawContact] } });
      expect((await ContactService.listContacts({ page: 1 })).hasMore).toBe(false);
    });

    it('searches through contacts/search and trusts has_more', async () => {
      (apiService.get as jest.Mock).mockResolvedValueOnce({
        data: { payload: [rawContact], meta: { has_more: true } },
      });

      const result = await ContactService.listContacts({ page: 1, query: '  Ana ' });

      expect(apiService.get).toHaveBeenCalledWith('contacts/search', {
        params: { q: 'Ana', page: 1, sort: 'name' },
      });
      expect(result.hasMore).toBe(true);
    });

    it('creates a contact and keeps validation messages for the form', async () => {
      (apiService.post as jest.Mock).mockResolvedValueOnce({
        data: { payload: { contact: rawContact } },
      });

      const contact = await ContactService.createContact({
        name: 'Ana',
        phoneNumber: '+553199998888',
        email: null,
      });

      expect(apiService.post).toHaveBeenCalledWith(
        'contacts',
        { name: 'Ana', phone_number: '+553199998888', email: null },
        { quietStatuses: [422] },
      );
      expect(contact.id).toBe(7);
    });

    it('updates a contact', async () => {
      (apiService.put as jest.Mock).mockResolvedValueOnce({ data: { payload: rawContact } });

      const contact = await ContactService.updateContact(7, {
        name: 'Ana Souza',
        phoneNumber: '+553199998888',
        email: 'ana@exemplo.com',
      });

      expect(apiService.put).toHaveBeenCalledWith(
        'contacts/7',
        { name: 'Ana Souza', phone_number: '+553199998888', email: 'ana@exemplo.com' },
        { quietStatuses: [422] },
      );
      expect(contact.name).toBe('Ana');
    });
  });

  it('lists the inboxes a contact can be messaged through', async () => {
    (apiService.get as jest.Mock).mockResolvedValueOnce({
      data: {
        payload: [
          {
            inbox: { id: 3, name: 'WhatsApp', channel_type: 'Channel::Whatsapp' },
            source_id: '553199998888',
          },
        ],
      },
    });

    const result = await ContactService.getContactableInboxes(7);

    expect(apiService.get).toHaveBeenCalledWith('contacts/7/contactable_inboxes');
    expect(result).toEqual([
      {
        inbox: { id: 3, name: 'WhatsApp', channelType: 'Channel::Whatsapp' },
        sourceId: '553199998888',
      },
    ]);
  });
});
