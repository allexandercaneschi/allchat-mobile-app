# Widget de tela inicial

Widget "ALLChat" (Android) com o total de mensagens não lidas das conversas abertas atribuídas ao
agente e um botão **+** que abre a tela de nova conversa (`allchat://new-conversation`).

## Privacidade

O widget fica visível mesmo com o app bloqueado pela biometria, então mostra **apenas números**:
nenhum nome de cliente nem trecho de mensagem chega a ele (`src/widget/widgetContent.ts`).

## Quando atualiza

- a cada 30 minutos (mínimo permitido pelo Android);
- ao abrir o app ou voltar para ele;
- quando chega um push com o app aberto;
- ao entrar ou sair da conta.

Com o app fechado, o push do servidor traz um bloco `notification`, que o Android exibe sozinho sem
executar código do app — por isso o widget não muda nesse momento. Para atualizar na hora, o
servidor teria de enviar pushes só de dados (`data`), e o app é quem monta a notificação. O
manipulador de background (`src/navigation/index.tsx`) já chama a atualização para esse dia.

## Arquivos

- `index.js`: entrada do app; registra o app e a tarefa do widget.
- `src/widget/`: leitura dos números, conteúdo, tela do widget e atualização.
- `app.config.ts`: tamanho e período do widget (plugin `react-native-android-widget`).
- `assets/widget/preview.png`: prévia exibida no seletor de widgets do Android.
