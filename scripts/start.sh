#!/usr/bin/env bash

source "$(cd "$(dirname "$BASH_SOURCE")" && pwd)/lib.sh"

fh_require_file "$FH_ROOT/.env"
fh_require_file "$FH_ROOT/backend/.env"
fh_require_file "$FH_ROOT/web/.env.local"
command -v pnpm >/dev/null 2>&1 || fh_error "pnpm não encontrado. Ative o Corepack e instale pnpm 12."
command -v setsid >/dev/null 2>&1 || fh_error "O comando setsid (util-linux) é necessário para gerenciar API e interface."
[[ -d "$FH_ROOT/backend/node_modules" ]] || fh_error "Dependências da API ausentes. Execute pnpm install --frozen-lockfile em backend/."
[[ -d "$FH_ROOT/web/node_modules" ]] || fh_error "Dependências da interface ausentes. Execute pnpm install --frozen-lockfile em web/."
fh_validate_local_env

mkdir -p "$FH_PIDS" "$FH_LOGS"
if ! fh_tcp_open 5433 || ! fh_tcp_open 9000; then
    printf 'Iniciando PostgreSQL e Silo pelo Docker Compose...\n'
    fh_docker_compose up -d postgres minio
fi
fh_wait_tcp 5433 PostgreSQL
fh_wait_tcp 9000 Silo

"$FH_ROOT/scripts/seed-demo.sh"

START_API=1
START_WEB=1
for service in api web; do
    if fh_managed_process_alive "$service"; then
        port=3000
        url=http://localhost:3000
        label=API
        [[ "$service" == web ]] && port=3001 && url=http://localhost:3001 && label=interface
        fh_wait_http "$url" "$label"
        printf '%s já estava iniciada pelo FullHouse; reutilizando o processo.\n' "$label"
        [[ "$service" == api ]] && START_API=0 || START_WEB=0
    else
        rm -f "$FH_PIDS/$service.pid" "$FH_PIDS/$service.token"
        port=3000
        label=API
        [[ "$service" == web ]] && port=3001 && label=interface
        fh_check_app_port_free "$port" "$label"
    fi
done

if [[ "$START_API" == 1 ]]; then
    BUILD_DIR="$FH_RUNTIME/backend-build"
    rm -rf "$BUILD_DIR"
    mkdir -p "$BUILD_DIR"
    printf 'Compilando API...\n'
    (
        cd "$FH_ROOT/backend"
        pnpm exec tsc -p tsconfig.build.json --outDir "$BUILD_DIR" --declaration false --sourceMap false --incremental false
    )
    ln -s "$FH_ROOT/backend/node_modules" "$BUILD_DIR/node_modules"
    API_TOKEN="fullhouse-api-$$-$RANDOM"
    (
        cd "$FH_ROOT/backend"
        FULLHOUSE_MANAGED_TOKEN="$API_TOKEN" setsid node --env-file=.env "$BUILD_DIR/main.js" >>"$FH_LOGS/api.log" 2>&1 </dev/null &
        echo "$!" > "$FH_PIDS/api.pid"
        echo "$API_TOKEN" > "$FH_PIDS/api.token"
    )
fi

if [[ "$START_WEB" == 1 ]]; then
    WEB_TOKEN="fullhouse-web-$$-$RANDOM"
    (
        cd "$FH_ROOT/web"
        FULLHOUSE_MANAGED_TOKEN="$WEB_TOKEN" setsid pnpm dev --hostname 0.0.0.0 --port 3001 >>"$FH_LOGS/web.log" 2>&1 </dev/null &
        echo "$!" > "$FH_PIDS/web.pid"
        echo "$WEB_TOKEN" > "$FH_PIDS/web.token"
    )
fi

fh_wait_http http://localhost:3000 API
fh_wait_http http://localhost:3001 interface
printf '\nFullHouse está no ar:\n  Interface: http://localhost:3001\n  API:       http://localhost:3000\n  Insights:  http://localhost:3001/finance/insights\n'
printf 'Logins: demo@example.com, ana@example.com e bruno@example.com. Consulte scripts/README.md para as variáveis de acesso local.\n'
