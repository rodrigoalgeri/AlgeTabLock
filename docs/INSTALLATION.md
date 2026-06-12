# Instalacao local

Este projeto e uma extensao de navegador baseada em Manifest V3. Nao ha etapa de build obrigatoria.

## Chrome

1. Acesse `chrome://extensions`.
2. Ative o modo de desenvolvedor.
3. Clique em "Carregar sem compactacao".
4. Selecione a pasta `AlgeTabLock/`, que contem `manifest.json`.
5. Fixe a extensao na barra do navegador, se desejar.

## Microsoft Edge

1. Acesse `edge://extensions`.
2. Ative o modo de desenvolvedor.
3. Clique em "Carregar sem compactacao".
4. Selecione a pasta `AlgeTabLock/`, que contem `manifest.json`.

## Atualizar depois de alterar o codigo

1. Volte para a pagina de extensoes.
2. Clique em atualizar/recarregar na extensao.
3. Abra o popup novamente.
4. Teste os fluxos alterados.

## Depuracao

- Para erros do popup, abra o popup, clique com o botao direito e escolha "Inspecionar".
- Para erros do background, abra a pagina de extensoes e clique no service worker da extensao.
- Verifique tambem as permissoes declaradas em `AlgeTabLock/manifest.json`.
