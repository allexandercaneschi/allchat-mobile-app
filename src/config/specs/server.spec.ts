import { parseServerUrl } from '../server';

describe('parseServerUrl', () => {
  it('builds the endpoints from an https origin', () => {
    expect(parseServerUrl('https://chat.exemplo.com.br')).toEqual({
      installationUrl: 'https://chat.exemplo.com.br/',
      baseUrl: 'chat.exemplo.com.br',
      webSocketUrl: 'wss://chat.exemplo.com.br/cable',
    });
  });

  it('accepts a trailing slash and surrounding whitespace', () => {
    expect(parseServerUrl('  https://chat.exemplo.com.br/ ').installationUrl).toBe(
      'https://chat.exemplo.com.br/',
    );
  });

  it('keeps the port in the host and uses ws for http', () => {
    expect(parseServerUrl('http://192.168.0.10:3000')).toEqual({
      installationUrl: 'http://192.168.0.10:3000/',
      baseUrl: '192.168.0.10:3000',
      webSocketUrl: 'ws://192.168.0.10:3000/cable',
    });
  });

  it.each([undefined, '', '   '])('rejects a missing value (%p)', value => {
    expect(() => parseServerUrl(value)).toThrow('não está definida');
  });

  it.each(['chat.exemplo.com.br', 'not a url', 'ftp://chat.exemplo.com.br'])(
    'rejects an invalid or non-http value (%p)',
    value => {
      expect(() => parseServerUrl(value)).toThrow('EXPO_PUBLIC_INSTALLATION_URL');
    },
  );

  it.each([
    'https://chat.exemplo.com.br/app',
    'https://chat.exemplo.com.br/?a=1',
    'https://x.com/#a',
  ])('rejects a value carrying a path, query or hash (%p)', value => {
    expect(() => parseServerUrl(value)).toThrow('sem caminho');
  });
});
