# API FullHouse

API REST construída com NestJS, Prisma 7 e PostgreSQL. Ela atende a interface em `web/` e usa Silo como armazenamento de objetos compatível com S3.

## Configurar e iniciar

Na raiz do repositório, copie `backend/.env.example` para `backend/.env` e ajuste os valores locais. O [guia principal](../README.md) explica como subir o stack completo ou iniciar somente PostgreSQL e Silo para executar a API no host.

Na pasta `backend`:

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm exec prisma migrate deploy
pnpm start:dev
```

A API inicia em `http://localhost:3000`. `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN` e as configurações `MINIO_*` são obrigatórias. `RESEND_API_KEY` só é necessária para enviar e-mails de recuperação de senha. Os valores e a finalidade de cada variável estão em [`.env.example`](.env.example).

## Prisma

O cliente é gerado em `src/generated/prisma/` e está ignorado pelo Git. Execute `pnpm db:generate` depois de instalar as dependências, alterar `prisma/schema.prisma` ou trocar a versão do Prisma. `pnpm exec prisma migrate deploy` aplica as migrações existentes sem criar novas.

## Verificações

```bash
pnpm test
pnpm test:e2e
pnpm lint
pnpm build
```

Os testes unitários não precisam de banco. Os testes e2e e de integração precisam do PostgreSQL configurado em `DATABASE_URL`.

## Proteções HTTP

Helmet configura os cabeçalhos HTTP de segurança. O limite padrão é de 120 requisições por IP a cada minuto; rotas de autenticação aceitam até 20 por IP no mesmo período. O contador fica em memória e serve para desenvolvimento ou uma única instância. Instalações com várias réplicas precisam usar armazenamento compartilhado para manter um limite consistente.

## Carga completa de dados para teste local

Configure `DATABASE_URL`, `DEMO_USER_PASSWORD` e `HOME_TEST_MEMBER_PASSWORD` no arquivo `.env` do backend. As duas senhas precisam ter pelo menos 8 caracteres. Depois, execute na pasta `backend`:

```bash
pnpm run db:seed:test
```

A carga cria ou preserva as contas de demonstração, uma residência com itens de despensa, e um segundo morador com tarefas e despesas de teste. Ela não apaga registros nem troca senhas de contas existentes e recusa execução com `NODE_ENV=production`.

Contas novas usam os e-mails `demo@example.com`, `ana@example.com`, `bruno@example.com` e `morador.teste@example.com`. As três contas de demonstração usam `DEMO_USER_PASSWORD`; a conta do segundo morador usa `HOME_TEST_MEMBER_PASSWORD`.

## Testar a Home com dois moradores

O script `prisma/seed-two-person-home-test.mjs` adiciona uma conta de teste a uma residência já existente e cria tarefas e despesas identificadas com `TESTE FULLHOUSE:`. Ele não apaga nem altera tarefas e despesas existentes. A conta principal precisa já ser moradora ativa da residência; se ela participar de mais de uma, informe também o ID da residência.

No arquivo `backend/.env`, configure a conexão para seu banco de desenvolvimento e os dados das duas contas:

```dotenv
NODE_ENV=development
HOME_TEST_SEED=1
DATABASE_URL="<URL do banco local de desenvolvimento>"
HOME_TEST_OWNER_EMAIL="<e-mail da sua conta>"
HOME_TEST_MEMBER_EMAIL="<novo e-mail exclusivo para a conta de teste>"
HOME_TEST_MEMBER_PASSWORD="<senha de teste com pelo menos 8 caracteres>"
# Opcional: obrigatório se a conta principal tiver mais de uma residência ativa
HOME_TEST_RESIDENCE_ID="<ID da residência>"
```

Depois, no PowerShell, execute a partir da pasta `backend`:

```powershell
pnpm run db:seed:home-test
```

O comando carrega as variáveis de `backend/.env` automaticamente.

Entre na aplicação com a conta principal para testar tarefas e despesas da casa; depois entre com o e-mail e a senha de teste para conferir os dados pessoais do segundo morador. O script usa a senha somente ao criar a conta. Em execuções posteriores, informe a mesma senha para continuar usando a conta já criada. Ele recusa execução com `NODE_ENV=production`.
