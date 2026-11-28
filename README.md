# FullHouse

Aplicação para organizar uma casa compartilhada: tarefas, despesas, despensa, lista de compras e animais de estimação. O repositório contém uma API NestJS, uma interface Next.js e serviços locais de PostgreSQL e armazenamento S3.

## Requisitos

- Node.js 26.8.1, versão de referência em `.nvmrc` e no Devbox
- pnpm 12 (`corepack enable` usa a versão declarada nos projetos)
- Docker com Docker Compose

Se usar o NVM, rode `nvm install` e `nvm use` na raiz do repositório. O pre-commit usa a versão instalada do `.nvmrc` quando o Git é iniciado com um Node incompatível com o ambiente de testes.

## Arquitetura

O FullHouse utiliza arquitetura cliente-servidor em camadas, com backend monolítico modular. A interface Next.js consome uma API NestJS organizada por funcionalidades, com persistência em PostgreSQL via Prisma e armazenamento de arquivos compatível com S3.

O [guia de arquitetura](docs/architecture/README.md) apresenta as figuras de visão geral, componentes e camadas, a stack, as justificativas técnicas, os registros de decisões e uma proposta de padronização incremental para discussão com a equipe.

## Subir localmente

Para inicializar a infraestrutura, aplicar as migrações, inserir os dados de demonstração e iniciar API/interface com um único comando, consulte [scripts/README.md](scripts/README.md). Os comandos disponíveis na raiz são `npm run start`, `npm run stop` e `npm run seed:demo`.

Na raiz do repositório, crie os arquivos de configuração:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp web/.env.example web/.env.local
pnpm install --frozen-lockfile
```

Os valores de exemplo são exclusivos para desenvolvimento local. Mantenha as credenciais iguais entre a raiz e `backend/.env` se alterar os dados do PostgreSQL ou do Silo.

Por padrão, suba somente os serviços de infraestrutura:

```bash
docker compose up -d
```

Isso inicia PostgreSQL e Silo. A API e a interface têm o profile opcional `container-app`, então não iniciam junto com `docker compose up -d`. Se já estavam rodando de uma inicialização anterior, pare-as uma vez com `docker compose stop api web`.

Para executar a API e a interface no host com hot reload — incluindo o envio de e-mail pela API local — inicie os serviços de infraestrutura e siga os passos abaixo. Para subir o stack inteiro em containers, use `docker compose --profile container-app up -d`.

```bash
docker compose up -d
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

O PostgreSQL do Compose é exposto ao host em `localhost:5433`, conforme `backend/.env.example`. Dentro da rede dos containers, a API utiliza `postgres:5432`. Esses endereços correspondem a modos diferentes de execução. Para criar fotos, crie no console do Silo ([http://localhost:9001](http://localhost:9001)) um bucket chamado `fullhouse`, usando as credenciais definidas em `.env`.

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

## Protótipo

- Figma: <a href="https://www.figma.com/design/cUDP98MCK6t4HV2pfHeeqP/Prot%C3%B3tipo-FullHouse?node-id=0-1&t=tsUGkTi8K2ujTOzq-1">
  Link protótipo </a>
