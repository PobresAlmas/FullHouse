#!/usr/bin/env bash

source "$(cd "$(dirname "$BASH_SOURCE")" && pwd)/lib.sh"

stop_managed_process() {
    local name="$1" pid_file="$FH_PIDS/$1.pid" token_file="$FH_PIDS/$1.token"
    [[ -f "$pid_file" ]] || return 0
    local pid token process_env pgid
    pid="$(cat "$pid_file")"
    token="$(cat "$token_file" 2>/dev/null || true)"
    if [[ ! "$pid" =~ ^[0-9]+$ || ! -r "/proc/$pid/environ" || -z "$token" ]]; then
        rm -f "$pid_file" "$token_file"
        return 0
    fi
    process_env="$(tr '\0' '\n' <"/proc/$pid/environ" | grep -F -x "FULLHOUSE_MANAGED_TOKEN=$token" || true)"
    if [[ -z "$process_env" ]]; then
        printf 'Ignorando PID %s de %s: o processo não corresponde ao marcador do FullHouse.\n' "$pid" "$name"
        rm -f "$pid_file" "$token_file"
        return 0
    fi
    pgid="$(ps -o pgid= -p "$pid" | tr -d ' ' || true)"
    printf 'Encerrando %s...\n' "$name"
    if [[ "$pgid" == "$pid" ]]; then
        kill -TERM -- "-$pid" 2>/dev/null || true
        for _ in {1..10}; do
            kill -0 -- "-$pid" 2>/dev/null || break
            sleep 1
        done
        kill -0 -- "-$pid" 2>/dev/null && kill -KILL -- "-$pid" 2>/dev/null || true
    else
        kill -TERM "$pid" 2>/dev/null || true
        for _ in {1..10}; do
            kill -0 "$pid" 2>/dev/null || break
            sleep 1
        done
        kill -0 "$pid" 2>/dev/null && kill -KILL "$pid" 2>/dev/null || true
    fi
    rm -f "$pid_file" "$token_file"
}

mkdir -p "$FH_PIDS"
stop_managed_process api
stop_managed_process web

if command -v docker >/dev/null 2>&1; then
    printf 'Parando PostgreSQL e Silo sem remover containers ou volumes...\n'
    fh_docker_compose stop postgres minio
else
    printf 'Docker não encontrado; os processos da API e interface foram encerrados.\n'
fi
printf 'FullHouse desligado. Os dados e volumes do banco foram preservados.\n'
