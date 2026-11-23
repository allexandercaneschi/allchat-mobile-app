# ALLChat (app Android)

App Android do ALLChat, o atendimento da ALL Tecnologias. É um fork do
[app oficial do Chatwoot](https://github.com/chatwoot/chatwoot-mobile-app), reduzido
a Android, com a URL do servidor fixa no build, tema escuro e a marca da ALL.

## Configuração

O endereço do servidor vem da variável `EXPO_PUBLIC_INSTALLATION_URL`, lida na hora do
build. Para desenvolvimento, copie o exemplo:

```sh
cp .env.example .env
pnpm install
```

O build de produção usa o arquivo `.env.production`. Sem a variável, o app e o
`app.config.ts` falham com uma mensagem clara; não existe URL padrão.

## Comandos

```sh
pnpm start             # servidor de desenvolvimento (precisa do dev client)
pnpm android           # compila e abre no aparelho/emulador
pnpm lint              # eslint
npx tsc --noEmit       # tipos
pnpm test              # testes
```

## Recursos próprios do ALLChat

- Bloqueio por biometria (ligado por padrão; Configurações > Bloqueio por biometria): pede
  a digital/rosto (ou o PIN do aparelho) ao abrir o app e ao voltar do segundo plano após
  30 segundos.
- Tela protegida: o app não aparece em capturas de tela, gravações nem na prévia de apps
  recentes (a conversa tem dados de clientes).

## Licença

Baseado em código do Chatwoot sob licença MIT. Veja `LICENSE`.
