# SPEC-008 — Tarefas

## Especificação

- [x] **T01 — Inspecionar inicialização atual e seeds.** Mapear Compose, processos host, variáveis locais, migrações, carga demo e contas de login.
- [x] **T02 — Definir o fluxo local.** Registrar comandos, requisitos, proteção de dados e módulos cobertos pelo seed.

## Implementação

- [x] **T03 — Completar dados de demonstração.** Inserir fixtures idempotentes de Compras, Pets, Regras, Reuniões e Chat na carga local existente.
- [x] **T04 — Criar script de carga.** Expor migrações + carga local, validando ambiente não produtivo e endereço local do banco.
- [x] **T05 — Criar inicialização e desligamento.** Gerenciar infraestrutura, API, web, PIDs, logs, readiness e preservação de volumes.
- [x] **T06 — Expor comandos npm.** Adicionar `start`, `stop` e `seed:demo` ao `package.json` raiz.
- [x] **T07 — Documentar uso.** Criar `scripts/README.md` e link no README principal com credenciais por variável, portas, logs e solução de problemas.

## Aceitação

- [ ] **T08 — Conferir comandos e dados locais.** Executar o seed, conferir login/dados nas telas principais, iniciar e parar o stack sem remover o banco.
