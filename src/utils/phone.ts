// Phone numbers are stored in E.164 (+55...). Brazilian mobile numbers are kept WITHOUT the extra
// leading 9 (8 subscriber digits), which is how ALLChat identifies WhatsApp contacts.

const BR_COUNTRY_CODE = '55';
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

// Area codes run from 11 to 99 and never start with 0.
const isValidBrAreaCode = (ddd: string) => /^[1-9][1-9]$/.test(ddd);

const normalizeBrazilian = (national: string): string | null => {
  if (national.length !== 10 && national.length !== 11) {
    return null;
  }
  const areaCode = national.slice(0, 2);
  let subscriber = national.slice(2);
  if (!isValidBrAreaCode(areaCode)) {
    return null;
  }
  // 9-digit mobile numbers lose the extra 9; a 9-digit number that does not start with 9 is invalid.
  if (subscriber.length === 9) {
    if (subscriber[0] !== '9') {
      return null;
    }
    subscriber = subscriber.slice(1);
  }
  return `+${BR_COUNTRY_CODE}${areaCode}${subscriber}`;
};

/**
 * Turns what a person typed into E.164, or returns null when it is not a valid number.
 * Without a leading "+", the number is treated as Brazilian.
 */
export const normalizePhone = (raw: string | null | undefined): string | null => {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return null;
  }
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (hasPlus) {
    if (digits.startsWith(BR_COUNTRY_CODE)) {
      return normalizeBrazilian(digits.slice(BR_COUNTRY_CODE.length));
    }
    const international = `+${digits}`;
    return E164_PATTERN.test(international) ? international : null;
  }

  // "0" is the trunk prefix used when dialing inside Brazil (e.g. 031 9999-8888).
  const withoutTrunk = digits.replace(/^0+/, '');
  // 12-13 digits starting with 55 carry the country code; 10-11 digits are an area code + number
  // (even when the area code itself is 55).
  if (withoutTrunk.startsWith(BR_COUNTRY_CODE) && withoutTrunk.length > 11) {
    return normalizeBrazilian(withoutTrunk.slice(BR_COUNTRY_CODE.length));
  }
  return normalizeBrazilian(withoutTrunk);
};

/** Readable form for lists: "+553199998888" -> "(31) 9999-8888". Other numbers are shown as stored. */
export const formatPhone = (e164: string | null | undefined): string => {
  if (!e164) {
    return '';
  }
  const match = /^\+55(\d{2})(\d{4})(\d{4})$/.exec(e164);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : e164;
};
