import { formatPhone, normalizePhone } from '../phone';

describe('normalizePhone', () => {
  it.each([
    ['(31) 99999-8888', '+553199998888'],
    ['31999998888', '+553199998888'],
    ['+55 31 99999-8888', '+553199998888'],
    ['5531999998888', '+553199998888'],
    ['031 9 9999-8888', '+553199998888'],
    ['(31) 9999-8888', '+553199998888'],
    ['+553199998888', '+553199998888'],
  ])('removes the extra 9 from the mobile number %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it('keeps landline numbers as they are', () => {
    expect(normalizePhone('(31) 3333-4444')).toBe('+553133334444');
  });

  it('treats 55 as an area code when the number has no country code', () => {
    expect(normalizePhone('55 99999-8888')).toBe('+555599998888');
  });

  it('keeps valid foreign numbers', () => {
    expect(normalizePhone('+1 (415) 555-2671')).toBe('+14155552671');
  });

  it.each([
    [''],
    [null],
    [undefined],
    ['abc'],
    ['12345'],
    ['(00) 99999-8888'],
    ['(31) 59999-8888'],
    ['+55 31 9999'],
    ['+0 123 456 7890'],
  ])('rejects %p', input => {
    expect(normalizePhone(input as string | null | undefined)).toBeNull();
  });
});

describe('formatPhone', () => {
  it('formats Brazilian numbers', () => {
    expect(formatPhone('+553199998888')).toBe('(31) 9999-8888');
  });

  it('returns other numbers untouched and empty for missing ones', () => {
    expect(formatPhone('+14155552671')).toBe('+14155552671');
    expect(formatPhone(null)).toBe('');
  });
});
