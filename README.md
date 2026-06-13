# AlgeTab Lock

Extensao Manifest V3 para proteger guias e grupos importantes contra fechamento acidental.

## Visao geral

O AlgeTab Lock permite travar uma guia individual ou um grupo de guias. A navegacao dentro da guia continua livre. Quando uma guia protegida e fechada, a extensao tenta restaura-la automaticamente na ultima URL segura visitada. Quando um grupo protegido e removido, a extensao recria o grupo com as guias salvas.

## Recursos

- Protecao de guia individual contra fechamento acidental.
- Protecao de grupo de guias.
- Restauracao automatica de guias protegidas na ultima URL segura visitada.
- Historico local de eventos recentes.
- Tema claro e escuro no popup.
- Validacao de URLs restauraveis para evitar navegacoes inseguras.

## Estrutura do projeto

```text
.
|-- AlgeTabLock/           # Codigo-fonte da extensao
|   |-- background.js      # Service worker da extensao
|   |-- manifest.json      # Manifesto Chrome Extension MV3
|   |-- popup.html         # Interface do popup
|   |-- popup.css          # Estilos do popup
|   |-- popup.js           # Logica da interface
|   |-- icons/             # Icones da extensao
|   |-- fonts/             # Fontes locais
|-- docs/                  # Documentacao tecnica e de release
|-- .github/               # Templates e padroes do GitHub
|-- CHANGELOG.md           # Historico de versoes
|-- VERSIONING.md          # Politica de versionamento
```

## Instalacao local

1. Abra `chrome://extensions` ou `edge://extensions`.
2. Ative o modo de desenvolvedor.
3. Clique em "Carregar sem compactacao".
4. Selecione a pasta `AlgeTabLock/`, onde esta o arquivo `manifest.json`.

Veja tambem [docs/INSTALLATION.md](docs/INSTALLATION.md).

## Versionamento

Este projeto usa versionamento semantico no formato `MAJOR.MINOR.PATCH`.

A versao oficial da extensao fica em `AlgeTabLock/manifest.json`, no campo `version`.

Documentos relacionados:

- [VERSIONING.md](VERSIONING.md)
- [CHANGELOG.md](CHANGELOG.md)
- [docs/RELEASE_PROCESS.md](docs/RELEASE_PROCESS.md)
- [docs/NOVA_VERSAO.md](docs/NOVA_VERSAO.md)
- [docs/GITHUB_SETUP.md](docs/GITHUB_SETUP.md)

## Desenvolvimento

Depois de alterar arquivos da extensao:

1. Abra a pagina de extensoes do navegador.
2. Clique em atualizar/recarregar na extensao.
3. Teste o popup e os fluxos de protecao.
4. Confira erros no service worker pelo painel de extensoes.

## Publicacao no GitHub

Com Git instalado, execute na pasta raiz deste projeto:

```bash
git init
git add .
git commit -m "docs: estrutura inicial do repositorio"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/AlgeTabLock.git
git push -u origin main
```

Substitua `SEU_USUARIO` pelo seu usuario ou organizacao no GitHub.

Para o passo a passo completo, consulte [docs/GITHUB_SETUP.md](docs/GITHUB_SETUP.md).

## Autor

Desenvolvido por AlgeriTec.

- Site: https://algeritec.com.br
- Contato: rodrigoalgeri.ms@gmail.com

## Licenca

Consulte [LICENSE](LICENSE).
