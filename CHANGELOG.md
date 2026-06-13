# Changelog

Todas as mudancas relevantes deste projeto serao documentadas aqui.

O formato segue a ideia de [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa versionamento semantico.

## [1.4.1] - 2026-06-13

### Corrigido

- Guias protegidas nao sao mais redirecionadas para a URL original durante a navegacao normal.
- Guias protegidas atualizam a URL salva durante a navegacao para restaurar de onde pararam.
- Guias restauradas voltam na mesma janela e posicao da guia fechada.
- Grupos restaurados preservam a cor original do grupo.

## [1.4.0] - 2026-06-12

### Adicionado

- Popup com navegacao interna entre inicio, protecoes, historico, ajustes, sobre e ajuda.
- Protecao de guia individual contra fechamento.
- Protecao de grupos de guias com snapshot restauravel.
- Historico local de eventos recentes.
- Alternancia entre tema claro e escuro.
- Validacao de URLs seguras antes de restaurar guias.

### Melhorado

- Interface com icones, estados visuais e textos explicativos.
- Recriacao de grupos protegidos quando removidos.
- Reassociacao de guias restauradas aos registros protegidos.

### Documentacao

- Estrutura inicial para GitHub.
- Politica de versionamento.
- Processo de release.
