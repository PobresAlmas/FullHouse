#!/usr/bin/env bash

set -Eeuo pipefail

FH_ROOT="$(cd "$(dirname "$BASH_SOURCE")/.." && pwd)"
FH_RUNTIME="$FH_ROOT/.fullhouse"
FH_PIDS="$FH_RUNTIME/pids"
FH_LOGS="$FH_RUNTIME/logs"

fh_error() {
    printf 'Erro: %s\n' "$*" >&2
    exit 1
}

fh_require_file() {
    [[ -f "$1" ]] || fh_error "Arquivo não encontrado: $1. Copie o respectivo .env.example e configure os valores locais."
}

fh_validate_local_env() {
    node --input-type=module - "$FH_ROOT" <<'NODE'
import fs from "node:fs";
import process from "node:process";

const root = process.argv[2];
function readEnv(path) {
    const values = {};
    for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
        const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
        if (!match) continue;
        let value = match[2];
        if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
            value = value.slice(1, -1);
        } else {
            value = value.replace(/\s+#.*$/, "");
        }
        values[match[1]] = value;
    }
    return values;
}

const rootEnv = readEnv(root + "/.env");
const backendEnv = readEnv(root + "/backend/.env");
const databaseUrl = process.env.DATABASE_URL || backendEnv.DATABASE_URL;
if (!databaseUrl) throw new Error("Configure DATABASE_URL em backend/.env.");
if ((process.env.NODE_ENV || backendEnv.NODE_ENV) === "production") {
    throw new Error("Este comando é somente para desenvolvimento; NODE_ENV está em production.");
}
const url = new URL(databaseUrl);
const hostname = url.hostname.replace(/^\[|\]$/g, "");
if (!["localhost", "127.0.0.1", "::1"].includes(hostname) || url.port !== "5433") {
    throw new Error("DATABASE_URL precisa apontar para PostgreSQL local em localhost:5433.");
}
if (decodeURIComponent(url.username) !== rootEnv.POSTGRES_USER ||
    decodeURIComponent(url.password) !== rootEnv.POSTGRES_PASSWORD) {
    throw new Error("As credenciais de DATABASE_URL precisam coincidir com POSTGRES_USER e POSTGRES_PASSWORD da raiz .env.");
}
const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
if (!databaseName || databaseName !== rootEnv.POSTGRES_DB) {
    throw new Error("O banco em backend/.env (DATABASE_URL) precisa coincidir com POSTGRES_DB da raiz .env.");
}
for (const [name, value] of [
    ["DEMO_USER_PASSWORD", process.env.DEMO_USER_PASSWORD || backendEnv.DEMO_USER_PASSWORD],
    ["HOME_TEST_MEMBER_PASSWORD", process.env.HOME_TEST_MEMBER_PASSWORD || backendEnv.HOME_TEST_MEMBER_PASSWORD],
]) {
    if (!value || value.length < 8) throw new Error("Configure " + name + " com pelo menos 8 caracteres em backend/.env.");
}
for (const name of ["DEMO_USER_PASSWORD", "HOME_TEST_MEMBER_PASSWORD"]) {
    if (process.env[name] && process.env[name] !== backendEnv[name]) {
        throw new Error("Remova " + name + " do ambiente do shell ou atualize backend/.env para manter a senha de acesso previsível.");
    }
}
console.log("Configuração local validada para o banco '" + databaseName + "'.");
NODE
}

fh_tcp_open() {
    timeout 1 bash -c "</dev/tcp/127.0.0.1/$1" >/dev/null 2>&1
}

fh_wait_tcp() {
    local port="$1" service="$2" attempts="${3:-60}"
    for ((attempt = 0; attempt < attempts; attempt += 1)); do
        fh_tcp_open "$port" && return 0
        sleep 1
    done
    fh_error "$service não respondeu na porta $port. Confira Docker Compose e os logs em $FH_LOGS."
}

fh_docker_compose() {
    command -v docker >/dev/null 2>&1 || fh_error "Docker não encontrado. Instale Docker Compose e tente novamente."
    if docker info >/dev/null 2>&1; then
        (cd "$FH_ROOT" && docker compose "$@")
    else
        command -v sudo >/dev/null 2>&1 || fh_error "Sem acesso ao Docker. Adicione seu usuário ao grupo docker ou execute este comando com sudo."
        (cd "$FH_ROOT" && sudo docker compose "$@")
    fi
}

fh_http_ready() {
    local url="$1" code
    code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 2 "$url" 2>/dev/null || true)"
    [[ "$code" =~ ^[23][0-9][0-9]$ ]]
}

fh_managed_process_alive() {
    local name="$1" pid_file="$FH_PIDS/$1.pid" token_file="$FH_PIDS/$1.token"
    [[ -f "$pid_file" && -f "$token_file" ]] || return 1
    local pid token
    pid="$(cat "$pid_file")"
    token="$(cat "$token_file")"
    [[ "$pid" =~ ^[0-9]+$ && -r "/proc/$pid/environ" && -n "$token" ]] || return 1
    tr '\0' '\n' <"/proc/$pid/environ" | grep -F -x "FULLHOUSE_MANAGED_TOKEN=$token" >/dev/null
}

fh_wait_http() {
    local url="$1" service="$2" attempts="${3:-60}"
    for ((attempt = 0; attempt < attempts; attempt += 1)); do
        fh_http_ready "$url" && return 0
        sleep 1
    done
    fh_error "$service não respondeu em $url. Consulte $FH_LOGS."
}

fh_check_app_port_free() {
    local port="$1" service="$2"
    if fh_tcp_open "$port"; then
        fh_error "A porta $port já está ocupada. Feche o processo atual de $service e execute npm run start novamente."
    fi
}
