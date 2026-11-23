# Chat interno da equipe no app móvel

Cliente móvel do chat interno do ALLChat (backend: repositório `allexandercaneschi/ALLChat`, branch
`allchat`, documento `docs/chat-interno.md` de lá). Este documento descreve como o app está organizado,
o que foi feito, o que falta e como testar num aparelho.

## Mapa do app (onde cada coisa vive)

| Assunto                                                         | Arquivo(s)                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Raiz do app (Redux Provider + PersistGate + navegação)          | `src/app.tsx`                                                                                                                                                                                                                                                                                                                                                                                            |
| Navegação: container, deep links e tratamento de push           | `src/navigation/index.tsx` (`linking`: `getStateFromPath`, `getInitialURL`, `subscribe`)                                                                                                                                                                                                                                                                                                                 |
| Pilha raiz (telas sem barra de abas: `ChatScreen`, etc.)        | `src/navigation/tabs/AppTabs.tsx`                                                                                                                                                                                                                                                                                                                                                                        |
| Abas (Inbox, Conversas, Configurações) e carga inicial de dados | `src/navigation/tabs/Tabs.tsx`                                                                                                                                                                                                                                                                                                                                                                           |
| Barra de abas e ícones                                          | `src/navigation/tabs/BottomTabBar.tsx`, `src/svg-icons/tabs/`                                                                                                                                                                                                                                                                                                                                            |
| Cliente HTTP e autenticação                                     | `src/services/APIService.ts` (axios; headers `access-token`, `uid`, `client` vêm de `state.auth.headers`; o `api/v1/accounts/:id/` é prefixado automaticamente; 401 faz logout; erro mostra toast, a menos que o status esteja em `quietStatuses`)                                                                                                                                                       |
| WebSocket (ActionCable)                                         | `src/utils/baseActionCableConnector.ts` (assina `RoomChannel` com o `pubsub_token`, descarta eventos de outra conta) e `src/utils/actionCable.ts` (mapa `events`, um handler por evento, que despacha para o Redux). Iniciado em `Tabs.tsx`                                                                                                                                                              |
| Store                                                           | `src/store/reducers.ts` (slices), `src/store/index.ts` (redux-persist, `blacklist`), `src/store/storeAccessor.ts`                                                                                                                                                                                                                                                                                        |
| Push (FCM)                                                      | `src/store/settings/settingsActions.ts` (token FCM -> `notification_subscriptions`), `src/utils/pushUtils.ts` (lê `data.payload` do FCM e monta o deep link), `src/navigation/index.tsx` (`getInitialNotification` = app fechado, `onNotificationOpenedApp` = segundo plano, `setBackgroundMessageHandler`), `src/screens/call/hooks/useRingingSync.ts` (`onMessage` = primeiro plano, só para ligações) |
| Notifee                                                         | só no iOS, para badge e limpar notificações (`src/utils/pushUtils.ts`). No Android a notificação é desenhada pelo sistema a partir do bloco `notification` do FCM, no canal indicado pelo servidor                                                                                                                                                                                                       |
| Canal Android de notificação                                    | `with-android-notification-channel.js` (config plugin, gera código em `MainApplication.kt` no prebuild) e `firebase.json` (canal padrão `default`)                                                                                                                                                                                                                                                       |
| i18n                                                            | `src/i18n/*.json` (`i18n.t('CHAVE.SUBCHAVE')`)                                                                                                                                                                                                                                                                                                                                                           |

## O que foi implementado

Tudo em arquivos novos, com poucos pontos de contato nos arquivos centrais.

- **API e tipos**: `src/services/internal-chat/internalChatService.ts` (todas as rotas de
  `/api/v1/accounts/:id/internal_chat/`), `src/store/internal-chat/` (slice, ações, seletores, tipos em camelCase).
- **Telas** (`src/screens/internal-chat/`):
  - _Lista_ (aba "Chat interno"): conversas diretas, salas de time e sala da empresa, ordenadas por atividade,
    contador de não lidas (também no ícone da aba), busca por nome e busca no texto das mensagens
    (`internal_chat/search`, a partir de 2 letras).
  - _Conversa_: histórico paginado (`before_id`), envio de texto em tempo real, marcação como lida
    (`channels/:id/read`) enquanto a tela está aberta e ao voltar do segundo plano.
  - _Nova conversa_: escolhe um colega (`GET agents`) e abre/cria a conversa direta.
  - _Pedir ajuda_: para uma pessoa (`recipient_id`) **ou** para um time do usuário (`team_id`).
- **Regras do backend respeitadas**: `can_post` falso (política de envio da sala) desabilita o campo e mostra o
  motivo; urgente só em conversa direta; "Chamar atenção" só em conversa direta, com contagem regressiva a partir do
  `retry_after` do 429; a sala da empresa não oferece pedido de ajuda, urgente nem chamar atenção; "Assumir" some
  para quem pediu e quando já foi assumido (se outra pessoa chegar antes, o 409 vira aviso e a conversa é
  atualizada); "Resolver" só para quem pediu ou quem assumiu. Ao assumir, abre a conversa direta com quem pediu.
- **Tempo real**: `internal_chat.message.created` e `internal_chat.message.updated` no mesmo ActionCable do app
  (`src/utils/actionCable.ts` -> `src/store/internal-chat/internalChatEvents.ts`). Atualizam mensagens, prévia,
  ordem da lista e contador. Conversa aberta na tela é lida na hora.
- **Push**:
  - Canal Android `urgent` (importância alta, vibração, som `assets/sounds/urgent.wav` copiado para
    `res/raw/urgent.wav`), criado pelo plugin de config. É o canal que o servidor usa (`channel_id: urgent`,
    `sound: urgent`) em mensagem urgente, @menção fora do expediente e "Chamar atenção".
  - Tocar na notificação (app fechado ou em segundo plano) abre a conversa:
    `.../app/accounts/:id/internal_chat/:channelId` (`src/screens/internal-chat/internalChatLinking.ts`).
  - Com o app aberto o Android não desenha o push; o campo `urgent` do payload e o websocket fazem o app vibrar e
    mostrar um aviso (uma vez só, mesmo chegando pelos dois caminhos) e a lista é atualizada.
  - A preferência `push_internal_message` aparece na tela de preferências de notificação.
- **Testes** (Jest): store, eventos, push, serviço, utilitários de regras, deep link, componentes e o plugin de
  config. Veja "Verificação".

### Pontos de contato nos arquivos centrais

`src/store/reducers.ts` (1 slice), `src/store/index.ts` (conversas privadas fora do `redux-persist`),
`src/utils/actionCable.ts` (2 eventos), `src/navigation/tabs/Tabs.tsx` (aba + hook de carga),
`src/navigation/tabs/BottomTabBar.tsx` (ícone + contador), `src/navigation/tabs/AppTabs.tsx` (3 telas na pilha raiz),
`src/navigation/index.tsx` (deep link), `src/utils/pushUtils.ts` (link do push interno),
`src/constants/index.ts` e `src/i18n/{en,pt_BR}.json` (textos), `with-android-notification-channel.js`.

## O que falta / pendências

Do app (fora do primeiro corte):

- Anexos, tela de auditoria, presença ("online") e "digitando", e-mail: fora do escopo combinado.
- Escolher @menção ao escrever (a API aceita `mentioned_user_ids`; o app ainda não oferece o seletor, mas
  mostra e alerta mensagens que mencionam o usuário).
- Vincular o pedido de ajuda a uma conversa de cliente (`conversation_id`, o `display_id`): a API aceita; falta o
  atalho na tela da conversa do cliente.
- Envio otimista e fila offline: a mensagem aparece quando o servidor responde; sem rede, o texto fica no campo.
- Layout de tablet (visão dividida): a área usa a tela cheia, como o Android de celular.
- Textos só em `en` e `pt_BR`; os demais idiomas caem em inglês.
- Rolar até a mensagem encontrada na busca (hoje abre a conversa).

Do backend (nada foi alterado lá; listado como pendência):

- Não existe "silenciar sala" por pessoa.
- Push de "Chamar atenção" sai com corpo vazio (`content` vazio); o título já diz tudo.
- Não há endpoint para abrir um canal só pelo id; o app usa a lista (`GET channels`) para isso.
- `GET channels` cria as salas (da empresa e dos times) como efeito colateral.

## iOS (apenas documentado, sem mexer em certificados)

O servidor manda `interruption-level: time-sensitive` para mensagem urgente / chamar atenção. Para o iOS honrar:

1. Ativar a capability **Time Sensitive Notifications** no App ID, no Apple Developer.
2. Adicionar o entitlement `com.apple.developer.usernotifications.time-sensitive: true` em `ios.entitlements` do
   `app.config.ts` (hoje só existe `aps-environment`) e regenerar o perfil de provisionamento.
3. Opcional: som próprio (o servidor manda `sound: default` no iOS); exigiria um `.caf`/`.wav` embutido no app e
   uma mudança no servidor.

Sem isso o iOS entrega o push normalmente, só sem a prioridade "urgente". O comportamento do push com o app aberto no
iOS não foi verificado (o app só vibra e mostra o aviso interno pelo websocket/`onMessage`).

## Como testar num aparelho

Pré-requisitos:

- **Backend**: o ALLChat com a branch `allchat` implantada (rotas `internal_chat`, evento no websocket, push com
  `internal_message`). Sem isso `GET internal_chat/channels` responde 404 e a aba mostra "O chat interno não está
  disponível neste servidor".
- **Firebase**: o servidor precisa ter `FIREBASE_PROJECT_ID`/`FIREBASE_CREDENTIALS` (ou o relay do Chatwoot Hub) e o app
  precisa do `google-services.json` do projeto, apontado por `EXPO_PUBLIC_ANDROID_GOOGLE_SERVICES_FILE` (arquivo fora do
  git, nunca commitar).
- Dois usuários da mesma conta (dois aparelhos, ou um aparelho + o painel web) e, para o pedido de ajuda ao time, os dois
  no mesmo time.

Build (o app usa módulos nativos, então não roda no Expo Go):

```bash
pnpm install
# build de desenvolvimento num aparelho Android ligado por USB
pnpm android
# ou build na nuvem do EAS (perfil production)
pnpm build:android
```

Como o canal e o som são gerados no prebuild, **faça um build novo** (não basta recarregar o JS). Num aparelho que já
teve uma versão antiga do app, o Android guarda as configurações de canal: se o som do canal `urgent` não mudar,
desinstale o app (ou limpe os dados) e instale de novo.

Roteiro:

1. Abra a aba **Chat interno**: devem aparecer a sala da empresa e as salas dos seus times.
2. **Nova conversa** -> colega -> envie texto; no outro aparelho a mensagem aparece sem recarregar e o contador sobe.
3. Sala da empresa com envio restrito (Configurações > Conta > Salas do chat, no painel web): o campo fica desabilitado.
4. **Urgente**: marque no composer (só conversa direta). **Chamar atenção**: o botão fica com contagem regressiva de
   60 s; tentar de novo antes disso (outro aparelho/painel) deve manter a contagem do `retry_after`.
5. **Pedir ajuda** para uma pessoa e para o time: no destino aparecem **Assumir** e **Resolver** conforme as regras;
   se duas pessoas tocam em Assumir ao mesmo tempo, só a primeira assume.
6. Push com o app em segundo plano/fechado: a notificação normal chega no canal `default`; a urgente / chamar atenção no
   canal `urgent` (Configurações do Android > Apps > ALLChat > Notificações deve listar "Urgente (chat interno)"). Tocar
   abre a conversa certa. Para testar fora do expediente, use caixas com horário configurado e fechadas.

## Verificação (no ambiente de desenvolvimento em nuvem)

Rodou: `pnpm install`, `npx tsc --noEmit`, `npx eslint` nos arquivos alterados, `npx prettier --check`, `npx jest`
(suíte completa) e um `expo prebuild --platform android` real para conferir o `MainApplication.kt` e o `res/raw/urgent.wav`
gerados pelo plugin (com um `google-services.json` falso e descartável, fora do repositório).

Não rodou (precisa de SDK/aparelho): compilação Gradle/Kotlin, build do EAS, testes em aparelho, push real do FCM,
iOS.
