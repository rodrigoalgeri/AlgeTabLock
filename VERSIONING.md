# Versionamento

O AlgeTab Lock segue versionamento semantico no formato:

```text
MAJOR.MINOR.PATCH
```

Exemplo: `1.4.0`

## Fonte da verdade

A versao publica da extensao e definida em:

```text
AlgeTabLock/manifest.json -> version
```

Sempre que uma nova versao for publicada, atualize:

- `AlgeTabLock/manifest.json`
- `CHANGELOG.md`
- textos internos do popup que mencionam a versao, quando existirem

## Regras

### MAJOR

Incremente quando houver mudancas incompativeis ou alteracoes grandes de comportamento.

Exemplo:

- Remover uma funcionalidade existente.
- Alterar o formato do armazenamento local de forma incompativel.
- Exigir uma nova permissao sensivel que mude a confianca do usuario.

### MINOR

Incremente quando houver nova funcionalidade compativel.

Exemplo:

- Adicionar nova tela no popup.
- Criar nova opcao de protecao.
- Melhorar fluxo de restauracao sem quebrar o uso atual.

### PATCH

Incremente quando houver correcao ou melhoria pequena sem nova funcionalidade principal.

Exemplo:

- Corrigir bug visual.
- Ajustar validacao de URL.
- Melhorar mensagens e estados vazios.

## Tags Git

Cada release deve ter uma tag no formato:

```text
vMAJOR.MINOR.PATCH
```

Exemplo:

```bash
git tag -a v1.4.0 -m "AlgeTab Lock v1.4.0"
git push origin v1.4.0
```

## Convencao de commits

Use mensagens objetivas, de preferencia no estilo Conventional Commits:

```text
feat: adiciona protecao de grupos
fix: corrige restauracao de guia fechada
docs: atualiza processo de release
style: ajusta layout do popup
chore: organiza arquivos do repositorio
```

Tipos recomendados:

- `feat`: nova funcionalidade.
- `fix`: correcao de bug.
- `docs`: documentacao.
- `style`: estilos, UI ou formatacao sem alterar regra de negocio.
- `refactor`: reorganizacao interna sem mudar comportamento.
- `chore`: manutencao geral.

## Checklist de versao

- Atualizar `AlgeTabLock/manifest.json`.
- Atualizar versao exibida no popup, se aplicavel.
- Registrar mudancas em `CHANGELOG.md`.
- Testar instalacao local da extensao.
- Criar commit de release.
- Criar tag Git.
- Publicar a tag no GitHub.
