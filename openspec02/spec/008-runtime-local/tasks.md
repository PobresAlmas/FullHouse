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

- [x] **T09 — Usar Node compatível no pre-commit.** Reproduzir a falha de inicialização do Vitest no Node 20, selecionar a versão do projeto via NVM quando necessário e rodar o hook com o PATH original. **Refs** RF06, CA06.

`.husky/_/pre-commit` passou com Node 20.20.0 no PATH inicial. O hook selecionou o Node 26.8.1 e executou ESLint, Prettier e Vitest nos dois pacotes. Passaram 334 testes no frontend e 524 no backend. O teste de erro da Lista de compras usa uma resposta simulada para a consulta da barra lateral. Sem o NVM sob o Node 20, `sh -e .husky/pre-commit` mostrou a orientação de configuração antes das verificações.
