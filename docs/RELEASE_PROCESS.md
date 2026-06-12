# Processo de release

Use este roteiro sempre que for publicar uma nova versao.

## 1. Definir a nova versao

Consulte [../VERSIONING.md](../VERSIONING.md) e escolha o incremento correto:

- `MAJOR`: mudanca incompativel.
- `MINOR`: nova funcionalidade compativel.
- `PATCH`: correcao ou melhoria pequena.

## 2. Atualizar arquivos

Atualize:

- `AlgeTabLock/manifest.json`
- `CHANGELOG.md`
- textos do popup que exibem a versao, se aplicavel

## 3. Testar localmente

Checklist minimo:

- Carregar extensao sem compactacao.
- Abrir popup sem erros.
- Travar e destravar uma guia.
- Travar e destravar um grupo.
- Fechar uma guia protegida e validar restauracao.
- Tentar alterar URL de uma guia protegida.
- Conferir historico.
- Alternar tema claro/escuro.

## 4. Criar commit

```bash
git add .
git commit -m "chore: release vX.Y.Z"
```

## 5. Criar tag

```bash
git tag -a vX.Y.Z -m "AlgeTab Lock vX.Y.Z"
git push origin main
git push origin vX.Y.Z
```

## 6. Criar release no GitHub

Na pagina do repositorio:

1. Acesse "Releases".
2. Clique em "Draft a new release".
3. Escolha a tag `vX.Y.Z`.
4. Cole as notas da versao do `CHANGELOG.md`.
5. Publique a release.

## 7. Empacotar para distribuicao

Crie um arquivo `.zip` contendo os arquivos da extensao, sem incluir:

- `.git/`
- `.github/`
- `docs/`
- arquivos temporarios

Inclua obrigatoriamente:

- `AlgeTabLock/manifest.json`
- `background.js`
- `popup.html`
- `popup.css`
- `popup.js`
- `icons/`
- `fonts/`
