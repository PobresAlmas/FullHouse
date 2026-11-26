# SPEC-008 — Design

## Decisão

Usar três scripts Bash na raiz e expô-los por scripts npm, preservando a stack atual: PostgreSQL/Silo em Docker Compose e API/interface rodando no host. O backend é compilado com `tsc` para `.fullhouse/backend-build` e executado pelo Node, evitando o erro atual do Nest CLI no Node 20. A interface usa `next dev` na porta 3001.

## Comandos

| Comando | Arquivo | Resultado |
| --- | --- | --- |
| `npm run start` | `scripts/start.sh` | Sobe/reutiliza PostgreSQL e Silo, aplica migrações, roda o seed, compila/inicia API e web e espera os endpoints responderem. |
| `npm run stop` | `scripts/stop.sh` | Encerra API/web iniciados pelos scripts e para containers PostgreSQL/Silo sem remover volumes. |
| `npm run seed:demo` | `scripts/seed-demo.sh` | Aplica migrações pendentes e executa a carga existente de teste local. |

## Dados e contas

- Reutilizar `backend/prisma/seed.mjs` e `backend/prisma/seed-two-person-home-test.mjs` como fonte dos registros; não embutir dados falsos na interface.
- Completar o conjunto com itens nos módulos centrais que ainda não têm fixture: Compras, Pets, Regras, Reuniões e Chat.
- Usar a casa `Casa de demonstração`, os moradores Emilson, Ana e Bruno e descrições iniciadas por `DEMO`. O seed adicional de dois moradores mantém `TESTE FULLHOUSE:` nos títulos e descrições para reconhecer registros criados pelas versões anteriores.
- Usar `DEMO_USER_PASSWORD` para `demo@example.com`, `ana@example.com` e `bruno@example.com`; usar `HOME_TEST_MEMBER_PASSWORD` para `morador.teste@example.com`.
- Inserções verificam existência por chave natural e nunca trocam senhas ou removem registros preexistentes.

## Execução e configuração

- `docker compose up -d postgres minio` inicia somente a infraestrutura. O Compose usa a porta host 5433 para PostgreSQL e 9000/9001 para Silo.
- O host executa migrations/seed pelo backend e a API na porta 3000; Next.js responde na 3001.
- As rotinas validam que `DATABASE_URL` é local e que o nome do banco coincide com `POSTGRES_DB` do `.env` raiz.
- Quando Docker não aceita conexão direta, os scripts usam `sudo docker compose`, que pode pedir senha no terminal do usuário.
- PIDs e logs ficam em `.fullhouse/pids` e `.fullhouse/logs`; `stop.sh` encerra somente PIDs registrados e os serviços Compose do projeto.
- Volumes do Compose continuam preservados ao desligar.

## Rastreabilidade

| Requisitos | Decisões | Critérios |
| --- | --- | --- |
| RF01–RF03, RNF04 | Scripts start/stop e estado em `.fullhouse/` | CA01, CA05 |
| RF04–RF05, RNF01–RNF03 | Seed idempotente com prefixo e credenciais por ambiente | CA02–CA04, CA06 |
| RF06 | README dedicado com comandos, portas e logs | CA01, CA03, CA06 |
