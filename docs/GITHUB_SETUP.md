# Publicacao no GitHub

Este guia considera que a raiz do repositorio e esta pasta:

```text
AlgeTabLock/
|-- AlgeTabLock/
|-- docs/
|-- .github/
|-- README.md
```

## 1. Instalar Git

Se o comando `git` nao funcionar no terminal, instale o Git for Windows:

```text
https://git-scm.com/download/win
```

Depois de instalar, feche e abra o terminal novamente.

## 2. Criar repositorio no GitHub

1. Acesse `https://github.com/new`.
2. Nomeie o repositorio como `AlgeTabLock`.
3. Escolha publico ou privado.
4. Nao marque para criar README, `.gitignore` ou license pelo GitHub, pois estes arquivos ja existem localmente.
5. Clique em "Create repository".

## 3. Inicializar Git local

Execute na pasta raiz do projeto:

```bash
git init
git add .
git commit -m "docs: estrutura inicial do repositorio"
git branch -M main
```

## 4. Conectar ao GitHub

Substitua `SEU_USUARIO` pelo seu usuario ou organizacao:

```bash
git remote add origin https://github.com/SEU_USUARIO/AlgeTabLock.git
git push -u origin main
```

## 5. Criar a primeira tag de versao

Como a versao atual e `1.4.0`, crie a tag:

```bash
git tag -a v1.4.0 -m "AlgeTab Lock v1.4.0"
git push origin v1.4.0
```

## 6. Configurar a pagina do repositorio

No GitHub, configure:

- Description: `Extensao MV3 para proteger guias e grupos contra fechamento acidental.`
- Website: `https://algeritec.com.br`
- Topics: `chrome-extension`, `manifest-v3`, `tabs`, `productivity`, `javascript`

## 7. Criar release

1. Abra a aba "Releases".
2. Clique em "Draft a new release".
3. Selecione a tag `v1.4.0`.
4. Use o conteudo de `CHANGELOG.md` como notas.
5. Publique a release.
