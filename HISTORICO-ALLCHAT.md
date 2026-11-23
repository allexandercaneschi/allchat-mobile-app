# ALLChat Mobile — Histórico do trabalho

Documento de continuidade do app Android ALLChat (fork do `chatwoot-mobile-app`).
Atualizado em 2026-11-23. Não contém senhas, keystore nem chaves privadas.

## 1. Visão geral

| Item | Valor |
|---|---|
| Projeto | ALLChat — app Android da ALL Tecnologias |
| Repositório do app | `allexandercaneschi/allchat-mobile-app` |
| Repositório do servidor | `allexandercaneschi/ALLChat` (branch `allchat`, imagem v1.4.0) |
| Branch de trabalho | `feat/poda-android` (ponta `57ddbd2`); a branch padrão é `develop` e nada foi mesclado nela |
| Branch da sessão na nuvem | `claude/bold-gauss-qsfd20` (idêntica à `feat/poda-android`, 21 commits à frente da `develop`) |
| Pacote Android | `br.com.alltecnologias.allchat` |
| Projeto Firebase | `all-chat-5e6ba` |
| Stack | React Native 0.86, Expo SDK 57 (CNG; `android/` é gerado e ignorado), pnpm 10.11.0, Node 22, Jest |
| Distribuição | APK (sem loja) |

### Regras do dono

- Código confiável, sem gambiarras.
- Só Android.
- Interface escura com azul `#35A8E0`.
- Idiomas apenas `en` e `pt_BR` (padrão `pt_BR`).
- Commits e PRs levam os trailers de atribuição do Claude Code.
- Nunca pedir nem registrar senhas, keystore ou chaves privadas.

## 2. Ambiente

### Máquina do dono (Windows)

- PowerShell 5 (não aceita `&&`).
- JDK 17, Node 22.23.5, pnpm 10.11.0, Git 2.56.
- Android Studio com SDK em `C:\Users\allwe\AppData\Local\Android\Sdk` (sem cmdline-tools nem NDK).
- adb em `C:\platform-tools\adb.exe`.
- Clone local: `C:\dev\allchat-mobile-app`.
- Aparelho de teste: Samsung `RQCN800FZ4J`.
- O build local não é necessário; o caminho preferido é o GitHub Actions.

### Sessão na nuvem (Claude Code)

- Não acessa o PC (o Remote Control recusou as pastas).
- Não cria tags nem Releases.
- Não fala com o servidor ALLChat.
- Consegue ler o repositório do servidor (público) e enviar para a branch `claude/bold-gauss-qsfd20`.

## 3. Verificação do código

```bash
npx tsc --noEmit
pnpm lint
TZ=UTC pnpm test --ci
```

Estado: 75 suites passam; há 1 warning antigo de eslint no `AudioRecorder`.

## 4. Build e distribuição do APK

- Workflow: `.github/workflows/build-apk.yml`, disparado por tag `v*` ou manualmente.
- O job `release` publica o APK em Releases (pré-release, pública).
- A tag `v0.1.4` gerou `allchat-0.1.4-5.apk` com sucesso:
  https://github.com/allexandercaneschi/allchat-mobile-app/releases/tag/v0.1.4
- Para um APK novo, criar a tag no PC (a nuvem não consegue):

```powershell
git checkout feat/poda-android
git pull
git tag v0.1.5
git push origin v0.1.5
```

- Secrets do GitHub (todos corretos): `ALLCHAT_KEYSTORE_BASE64`, `ALLCHAT_KEYSTORE_PASSWORD`, `ALLCHAT_KEY_ALIAS` (`allchat`), `ALLCHAT_KEY_PASSWORD`, `GOOGLE_SERVICES_JSON_BASE64`.
- O workflow valida que o `google-services.json` contém o pacote `br.com.alltecnologias.allchat` e apaga o keystore e o JSON ao final.

## 5. Trabalho já feito (branch `feat/poda-android`)

- Poda do app para Android: remoção de iOS e dos scripts de plugin iOS/Notifee (`with-ios-scene-lifecycle.js`, `with-notifee-maven-repo.js`).
- Identidade ALLChat: pacote, tema escuro com `#35A8E0`, idiomas `en` e `pt_BR`.
- Build de release no GitHub Actions: mais memória para o Gradle, cor das notificações declarada no manifest, publicação do APK em Releases quando a execução vem de tag.

### Dívida técnica conhecida da poda

- Componentes `Glass*` com fallback sem vidro.
- Props `iosStyle`, `composer` e `glass` com ramos mortos.
- `errorUtils.errorHandler` sem uso.

## 6. Problema em aberto: o app não recebe push

O ALLChat não recebe notificações push; o app oficial (`com.chatwoot.app`), no mesmo aparelho, recebe. O logcat mostra pushes só do pacote `com.chatwoot.app`.

### 6.1 O que o app faz (correto)

- `src/navigation/tabs/Tabs.tsx` pede a permissão com `react-native-permissions` e depois chama `settingsActions.saveDeviceDetails`.
- `src/store/settings/settingsActions.ts` obtém o token FCM com `getToken(getMessaging())` e envia `subscription_type: 'fcm'` com `push_token` e `device_id` (`getUniqueId`).
- `src/navigation/index.tsx` registra `setBackgroundMessageHandler`.
- `app.config.ts` inclui `@react-native-firebase/app` e `@react-native-firebase/messaging` e aponta para `google-services.json`.

### 6.2 Causa confirmada no código do servidor

Em `app/services/notification/push_notification_service.rb` (ALLChat, branch `allchat`, commit `60113da`):

1. `send_fcm_push` só envia se `FIREBASE_PROJECT_ID` **e** `FIREBASE_CREDENTIALS` estiverem preenchidos (config global).
2. `send_push_via_chatwoot_hub` só roda se o Firebase **não** estiver configurado; ele usa o relay do Chatwoot, que só entrega a tokens do projeto Firebase do Chatwoot.
3. Hoje o Firebase do ALLChat não está configurado, então só o relay é usado. O token do ALLChat pertence ao projeto `all-chat-5e6ba`, e o relay não entrega nele.

### 6.3 Hipótese secundária (também existe no código)

`mobile_push_allowed?` bloqueia o push ao celular quando a caixa tem horário de trabalho ativo e a conversa está fora do expediente (incluindo pausas). Nesse caso o log registra `Mobile push skipped ... outside business hours`.

### 6.4 Detalhe sobre as subscriptions

`NotificationSubscriptionBuilder` usa `device_id` como identificador único das subscriptions `fcm`. Se os dois apps no mesmo aparelho tivessem o mesmo `device_id`, o último a registrar sobrescreveria o outro. No Android 8+ o ANDROID_ID depende da chave de assinatura, então deveriam ser diferentes; o console confirma.

### 6.5 Correção (no servidor, sem expor credenciais)

1. Super Admin > App Config > Firebase.
2. `FIREBASE_PROJECT_ID` = `all-chat-5e6ba`.
3. `FIREBASE_CREDENTIALS` = conteúdo do JSON da conta de serviço desse projeto (colar só no painel).
4. Reiniciar web e Sidekiq.
5. Conferir no console Rails:

```ruby
NotificationSubscription.where(subscription_type: 'fcm').order(:created_at).last(3).map { |s| [s.identifier, s.user_id, s.subscription_attributes['deviceName'], s.created_at] }
```

6. Nos logs do Sidekiq, procurar `FCM push sent to <email>` (sucesso) ou erros com `fcm`/`send_v1`.

**Efeito colateral:** depois dessa configuração o app oficial deixa de receber push desse servidor, pois o envio passa a usar só o projeto Firebase do ALLChat.

### 6.6 Teste no aparelho

```powershell
C:\platform-tools\adb.exe -s RQCN800FZ4J logcat -c
C:\platform-tools\adb.exe -s RQCN800FZ4J logcat | Select-String "ReactNativeFirebaseMsg|FirebaseMessaging|FCM|allchat"
```

Abrir o app, mandar uma mensagem de outro contato (dentro do expediente da caixa) e procurar entradas de `br.com.alltecnologias.allchat`.

## 7. Cronologia desta sessão (2026-11-23)

1. Conferido o clone da nuvem: estava em `cbfad0b` (ponta do upstream); a `feat/poda-android` existia no remoto em `57ddbd2`.
2. Branch `claude/bold-gauss-qsfd20` avançada por fast-forward até `57ddbd2`.
3. Confirmado no app que o registro do token FCM e a configuração do Firebase estão corretos.
4. Repositório do servidor (`ALLChat`, branch `allchat`) clonado só para leitura.
5. Lido `push_notification_service.rb`, `notification_subscription_builder.rb`, `installation_config.yml`: causa confirmada (seção 6.2).
6. Hook pediu push dos 21 commits; enviada a branch `claude/bold-gauss-qsfd20` ao remoto. Nenhum commit novo foi criado.
7. Gerado este documento.

## 8. Próximos passos

1. Configurar o Firebase `all-chat-5e6ba` no servidor e reiniciar web e Sidekiq (seção 6.5).
2. Repetir o teste de push no aparelho (seção 6.6). Se falhar, coletar o resultado do console Rails e a linha de log do Sidekiq (sem credenciais).
3. Com o push funcionando, testar em aparelho: login, biometria, nova conversa por deep link `allchat://new-conversation` e o widget de tela inicial.
4. Gerar um APK novo criando a tag `v0.1.5` no PC.
5. Opcional, só se o dono quiser: mudança no servidor para enviar push aos dois apps (oficial e ALLChat) na transição, marcando o app de origem na subscription e roteando por ele.
6. Limpar a dívida técnica da poda (seção 5).
