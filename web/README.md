# Interface Web FullHouse

Aplicação Next.js que consome a API do FullHouse. A interface usa React, TypeScript, Tailwind CSS e Vitest.

A interface corresponde à apresentação da arquitetura cliente-servidor em camadas. As figuras e responsabilidades estão no [guia de arquitetura](../docs/architecture/README.md).

## Desenvolvimento local

Suba a API e os serviços locais conforme o [README principal](../README.md). Em seguida, execute dentro da pasta `web`:

```bash
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm dev --port 3001
```

Acesse [http://localhost:3001](http://localhost:3001). `NEXT_PUBLIC_API_URL` aponta para a API e, por padrão, usa `http://localhost:3000`.

O cliente HTTP compartilhado envia cookies de autenticação. Alterações em `NEXT_PUBLIC_API_URL` exigem reiniciar o servidor de desenvolvimento ou gerar novamente o build. Essa variável é pública e não deve conter segredos.

## Verificações

```bash
pnpm test --run
pnpm lint
pnpm build
```

As páginas ficam em `app/`; os componentes e integrações são organizados em `features/` e `components/`.
