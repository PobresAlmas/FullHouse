# FullHouse

Aplicação para organizar uma casa compartilhada: tarefas, despesas, despensa, lista de compras e animais de estimação. O repositório contém uma API NestJS, uma interface Next.js e serviços locais de PostgreSQL e armazenamento S3.

## Requisitos

- Node.js 22 ou superior
- pnpm 12 (`corepack enable` usa a versão declarada nos projetos)
- Docker com Docker Compose

## Subir localmente

Na raiz do repositório, crie os arquivos de configuração:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp web/.env.example web/.env.local
pnpm install --frozen-lockfile
```

Os valores de exemplo são exclusivos para desenvolvimento local. Mantenha as credenciais iguais entre a raiz e `backend/.env` se alterar os dados do PostgreSQL ou do Silo.

Suba a aplicação inteira em containers:

```bash
docker compose up -d
docker compose logs -f api web
```

O Compose inicia PostgreSQL, Silo, API e interface. O container da API instala as dependências, gera o cliente Prisma e aplica as migrações na primeira inicialização. Para criar fotos, crie no console do Silo ([http://localhost:9001](http://localhost:9001)) um bucket chamado `fullhouse`, usando as credenciais definidas em `.env`.

Para executar API e interface no host com hot reload, inicie apenas os serviços de infraestrutura:

```bash
docker compose up -d postgres minio
```

Depois, prepare a API em um terminal:

```bash
cd backend
pnpm install --frozen-lockfile
pnpm db:generate
pnpm exec prisma migrate deploy
pnpm start:dev
```

Em outro terminal, instale e inicie a interface com `cd web && pnpm install --frozen-lockfile && pnpm dev --port 3001`. Abra [http://localhost:3001](http://localhost:3001); a API fica em [http://localhost:3000](http://localhost:3000).

O serviço de arquivos usa [Silo](https://silo.pgsty.com/), um servidor de objetos compatível com S3 mantido como fork do MinIO. O backend já usa a API S3 do AWS SDK e as variáveis `MINIO_*`; Silo preserva esse contrato e oferece uma imagem publicada e mantida para o ambiente local.

## Prisma

O cliente Prisma é gerado localmente a partir de `backend/prisma/schema.prisma`; ele não precisa ser versionado. Execute `pnpm db:generate` dentro de `backend` após instalar dependências, mudar o schema ou atualizar Prisma. Aplique migrações existentes com `pnpm exec prisma migrate deploy`.

## Comandos úteis

Dentro de `backend`:

```bash
pnpm test
pnpm lint
pnpm build
pnpm exec prisma studio
```

Dentro de `web`:

```bash
pnpm test --run
pnpm lint
pnpm build
```

Os dados de demonstração são opcionais. Leia [backend/README.md](backend/README.md) antes de executar as cargas locais.

## Estrutura

- `backend/`: API NestJS, schema, migrações e cargas de demonstração
- `web/`: interface Next.js e funcionalidades por domínio
- `docker-compose.yml`: API, interface, PostgreSQL e armazenamento S3 local
- `docs/` e `openspec/`: decisões, planejamento e especificações
