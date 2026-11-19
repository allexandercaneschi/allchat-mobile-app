# Gerar o APK do ALLChat

O APK assinado é gerado pelo GitHub Actions (`.github/workflows/build-apk.yml`). Ele roda quando
uma tag `v*` é criada (`git tag v0.1.0 && git push origin v0.1.0`) ou a mão, em
**Actions → Build APK → Run workflow**. Antes de compilar ele confere tipos, lint e testes.

O APK fica como **artefato da execução** (30 dias). Só quem tem acesso ao repositório baixa. Ele não
é publicado em Release de propósito: o repositório é público e o APK é só da equipe.

## Secrets necessários

Em **Settings → Secrets and variables → Actions → New repository secret**:

| Secret                        | O que é                                                            |
| ----------------------------- | ------------------------------------------------------------------ |
| `ALLCHAT_KEYSTORE_BASE64`     | O arquivo `.jks` da chave de assinatura, em base64                 |
| `ALLCHAT_KEYSTORE_PASSWORD`   | Senha do keystore                                                  |
| `ALLCHAT_KEY_ALIAS`           | Alias da chave dentro do keystore                                  |
| `ALLCHAT_KEY_PASSWORD`        | Senha da chave (num keystore PKCS12 é a mesma do keystore)         |
| `GOOGLE_SERVICES_JSON_BASE64` | O `google-services.json` do Firebase (`all-chat-5e6ba`), em base64 |

Se faltar algum, o workflow para logo no início dizendo qual.

### 1. Criar a chave de assinatura (uma vez, no seu computador)

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore allchat-release.jks \
  -alias allchat -keyalg RSA -keysize 4096 -validity 10000
```

**Guarde o `allchat-release.jks` e as senhas num cofre, fora do repositório.** Quem perde a chave
não consegue mais atualizar o app já instalado: o Android recusa um APK assinado com outra chave, e
só resta desinstalar e instalar de novo em todos os celulares. Nunca envie a chave ou as senhas em
chat, e-mail ou issue.

### 2. Cadastrar os secrets

Pela tela do GitHub, ou com o `gh` no seu computador:

```bash
base64 -w0 allchat-release.jks | gh secret set ALLCHAT_KEYSTORE_BASE64 -R allexandercaneschi/allchat-mobile-app
base64 -w0 google-services.json | gh secret set GOOGLE_SERVICES_JSON_BASE64 -R allexandercaneschi/allchat-mobile-app
gh secret set ALLCHAT_KEYSTORE_PASSWORD -R allexandercaneschi/allchat-mobile-app
gh secret set ALLCHAT_KEY_ALIAS -R allexandercaneschi/allchat-mobile-app
gh secret set ALLCHAT_KEY_PASSWORD -R allexandercaneschi/allchat-mobile-app
```

## Versão

- `versionCode` = número da execução do workflow (+ a variável opcional `ALLCHAT_VERSION_CODE_BASE`).
  O Android só instala um APK por cima de outro se esse número for maior. **Não renomeie nem recrie
  o arquivo do workflow**: o número da execução recomeçaria do 1. Se isso acontecer, defina
  `ALLCHAT_VERSION_CODE_BASE` (Settings → Secrets and variables → Actions → Variables) com o último
  `versionCode` usado.
- `versionName` = nome da tag sem o `v` (tag `v0.2.0` gera `0.2.0`). Numa execução manual vira
  `0.1.0-<commit>`.

## Conferência da assinatura

O workflow roda o `apksigner` no APK e falha se ele estiver assinado com a chave de debug. O resumo
da execução mostra o SHA-256 do certificado. Guarde esse valor: ele precisa ser o mesmo em todo
APK que você distribuir.

## Build local

```bash
export ALLCHAT_KEYSTORE_FILE=/caminho/allchat-release.jks
export ALLCHAT_KEYSTORE_PASSWORD=... ALLCHAT_KEY_ALIAS=allchat ALLCHAT_KEY_PASSWORD=...
NODE_ENV=production npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a
```

Sem `ALLCHAT_KEYSTORE_FILE` o release sai assinado com a chave de debug: serve para testar no seu
celular, não para distribuir.
