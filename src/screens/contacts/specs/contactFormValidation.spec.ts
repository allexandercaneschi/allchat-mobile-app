import { validateContactForm } from '../contactFormValidation';

describe('validateContactForm', () => {
  it('normalizes the phone and trims the fields', () => {
    const result = validateContactForm({
      name: '  Ana Souza ',
      phone: '(31) 99999-8888',
      email: ' ana@exemplo.com ',
    });
    expect(result).toEqual({
      ok: true,
      values: { name: 'Ana Souza', phoneNumber: '+553199998888', email: 'ana@exemplo.com' },
    });
  });

  it('accepts a contact without e-mail', () => {
    const result = validateContactForm({ name: 'Ana', phone: '3133334444', email: '  ' });
    expect(result).toEqual({
      ok: true,
      values: { name: 'Ana', phoneNumber: '+553133334444', email: null },
    });
  });

  it('requires name and phone', () => {
    expect(validateContactForm({ name: ' ', phone: '', email: '' })).toEqual({
      ok: false,
      errors: {
        name: 'CONTACTS.FORM.ERRORS.NAME_REQUIRED',
        phone: 'CONTACTS.FORM.ERRORS.PHONE_REQUIRED',
      },
    });
  });

  it('flags an invalid phone and an invalid e-mail', () => {
    expect(validateContactForm({ name: 'Ana', phone: '12345', email: 'ana@' })).toEqual({
      ok: false,
      errors: {
        phone: 'CONTACTS.FORM.ERRORS.PHONE_INVALID',
        email: 'CONTACTS.FORM.ERRORS.EMAIL_INVALID',
      },
    });
  });
});
