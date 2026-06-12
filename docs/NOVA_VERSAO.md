# Como lancar uma nova versao

Use este guia sempre que for publicar uma nova versao do AlgeTab Lock.

## 1. Entender qual versao usar

A versao segue o formato:

```text
MAJOR.MINOR.PATCH
```

Se a versao atual for `1.4.0`, use:

```text
1.4.1 -> correcao pequena
1.5.0 -> nova funcionalidade
2.0.0 -> mudanca grande ou incompativel
```

Exemplos:

- Corrigiu texto, layout ou bug pequeno: aumente o `PATCH`.
- Adicionou uma tela, botao ou recurso novo: aumente o `MINOR`.
- Mudou comportamento principal ou quebrou compatibilidade: aumente o `MAJOR`.

## 2. Atualizar o manifest

Abra:

```text
AlgeTabLock/manifest.json
```

Altere o campo `version`.

Exemplo:

```json
"version": "1.4.1"
```

## 3. Atualizar versao exibida no popup

Abra:

```text
AlgeTabLock/popup.html
```

Procure textos como:

```text
Versao 1.4.0 Beta
Release atual: v1.4.0
```

Atualize para a nova versao.

Exemplo:

```text
Versao 1.4.1 Beta
Release atual: v1.4.1
```

## 4. Atualizar o changelog

Abra:

```text
CHANGELOG.md
```

Adicione uma nova secao no topo do arquivo.

Para correcao:

```md
## [1.4.1] - 2026-06-12

### Corrigido

- Corrige comportamento X.
- Ajusta texto Y.
```

Para nova funcionalidade:

```md
## [1.5.0] - 2026-06-12

### Adicionado

- Adiciona funcionalidade X.

### Melhorado

- Melhora comportamento Y.
```

## 5. Testar antes de publicar

Checklist minimo:

- Carregar a extensao em `chrome://extensions`.
- Abrir o popup sem erro.
- Travar e destravar uma guia.
- Travar e destravar um grupo.
- Fechar uma guia protegida e conferir se ela volta.
- Alterar URL de uma guia protegida e conferir se ela retorna.
- Conferir historico.
- Alternar tema claro e escuro.
- Conferir se a nova versao aparece no popup.

## 6. Fazer commit

No terminal, dentro da raiz do projeto:

```text
C:\Users\rodrigo.algeri\Documents\trae_projects\AlgeTabLock
```

Execute:

```bash
git status
git add .
git commit -m "chore: release vX.Y.Z"
git push
```

Troque `X.Y.Z` pela versao nova.

Exemplo:

```bash
git commit -m "chore: release v1.4.1"
```

## 7. Criar a tag da versao

Depois do commit:

```bash
git tag -a vX.Y.Z -m "AlgeTab Lock vX.Y.Z"
git push origin vX.Y.Z
```

Exemplo:

```bash
git tag -a v1.4.1 -m "AlgeTab Lock v1.4.1"
git push origin v1.4.1
```

## 8. Criar a release no GitHub

Abra:

```text
https://github.com/rodrigoalgeri/AlgeTabLock/releases/new
```

Preencha:

```text
Choose a tag: vX.Y.Z
Release title: AlgeTab Lock vX.Y.Z
Release description: copie a secao da nova versao do CHANGELOG.md
```

Se a versao ainda for beta, marque:

```text
Pre-release
```

Depois clique em:

```text
Publish release
```

## Resumo rapido

```bash
git status
git add .
git commit -m "chore: release vX.Y.Z"
git push
git tag -a vX.Y.Z -m "AlgeTab Lock vX.Y.Z"
git push origin vX.Y.Z
```

Depois crie a release no GitHub usando a tag publicada.
