#!/usr/bin/env bash

source "$(cd "$(dirname "$BASH_SOURCE")" && pwd)/lib.sh"

fh_require_file "$FH_ROOT/.env"
fh_require_file "$FH_ROOT/backend/.env"
command -v pnpm >/dev/null 2>&1 || fh_error "pnpm não encontrado. Ative o Corepack e instale pnpm 12."
[[ -d "$FH_ROOT/backend/node_modules" ]] || fh_error "Dependências da API ausentes. Execute pnpm install --frozen-lockfile em backend/."
fh_validate_local_env

cd "$FH_ROOT/backend"
printf 'Aplicando migrações pendentes...\n'
pnpm exec prisma migrate deploy
printf 'Inserindo dados de demonstração...\n'
pnpm run db:seed:test
