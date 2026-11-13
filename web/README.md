# Interface Web FullHouse

Aplicação Next.js que consome a API do FullHouse. A interface usa React, TypeScript, Tailwind CSS e Vitest.

## Desenvolvimento local

Na raiz, copie a configuração inicial e suba a API e os serviços locais conforme o [README principal](../README.md). Em seguida:

```bash
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm dev --port 3001
```

Acesse [http://localhost:3001](http://localhost:3001). `NEXT_PUBLIC_API_URL` aponta para a API e, por padrão, usa `http://localhost:3000`.

## Verificações

```bash
pnpm test --run
pnpm lint
pnpm build
```

As páginas ficam em `app/`; os componentes e integrações são organizados em `features/` e `components/`.
