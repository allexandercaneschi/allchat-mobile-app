import { normalizePhone } from '@/utils/phone';
import type { ContactFormValues } from '@/store/contact/contactTypes';

export type ContactFormInput = { name: string; phone: string; email: string };

export type ContactFormErrors = Partial<Record<keyof ContactFormInput, string>>;

export type ContactFormValidation =
  | { ok: true; values: ContactFormValues }
  | { ok: false; errors: ContactFormErrors };

// Pragmatic check: something@something.tld. The server has the final word.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Error values are i18n keys, so the screen decides how to show them. */
export const validateContactForm = (input: ContactFormInput): ContactFormValidation => {
  const errors: ContactFormErrors = {};
  const name = input.name.trim();
  const email = input.email.trim();
  const phoneNumber = normalizePhone(input.phone);

  if (!name) {
    errors.name = 'CONTACTS.FORM.ERRORS.NAME_REQUIRED';
  }
  if (!input.phone.trim()) {
    errors.phone = 'CONTACTS.FORM.ERRORS.PHONE_REQUIRED';
  } else if (!phoneNumber) {
    errors.phone = 'CONTACTS.FORM.ERRORS.PHONE_INVALID';
  }
  if (email && !EMAIL_PATTERN.test(email)) {
    errors.email = 'CONTACTS.FORM.ERRORS.EMAIL_INVALID';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, values: { name, phoneNumber, email: email || null } };
};
