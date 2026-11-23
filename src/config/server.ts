export type ServerConfig = {
  /** Base URL of the ALLChat server, always with a trailing slash. */
  installationUrl: string;
  /** Host (and port, when given) of the server. */
  baseUrl: string;
  /** Action Cable endpoint. */
  webSocketUrl: string;
};

const MISSING_MESSAGE =
  'EXPO_PUBLIC_INSTALLATION_URL não está definida. Defina a URL do ALLChat (ex.: https://chat.exemplo.com.br) antes de gerar o app.';

/**
 * Builds the server endpoints from the URL baked into the build.
 *
 * The app talks to a single server, so a wrong value is a build error and not
 * something a user can fix: it throws instead of falling back to a default.
 * Only an origin is accepted, since the API paths are appended to it.
 */
export const parseServerUrl = (raw: string | undefined): ServerConfig => {
  const value = raw?.trim();
  if (!value) {
    throw new Error(MISSING_MESSAGE);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`EXPO_PUBLIC_INSTALLATION_URL inválida: "${value}".`);
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`EXPO_PUBLIC_INSTALLATION_URL deve usar http(s): "${value}".`);
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error(
      `EXPO_PUBLIC_INSTALLATION_URL deve conter só o endereço do servidor, sem caminho: "${value}".`,
    );
  }

  const webSocketScheme = url.protocol === 'https:' ? 'wss' : 'ws';
  return {
    installationUrl: `${url.origin}/`,
    baseUrl: url.host,
    webSocketUrl: `${webSocketScheme}://${url.host}/cable`,
  };
};

export const SERVER = parseServerUrl(process.env.EXPO_PUBLIC_INSTALLATION_URL);
