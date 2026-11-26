# Scripts locais do FullHouse

Os scripts ficam em **scripts/** na raiz do repositório. Execute os comandos a partir da raiz; eles usam npm como interface e pnpm para os projetos internos.

## Preparação

Requisitos: Node.js 20 ou superior, pnpm 12 via Corepack, Docker Compose e os arquivos locais de configuração. O README principal descreve a instalação das dependências. Crie os arquivos **.env**, **backend/.env** e **web/.env.local** a partir dos respectivos **.env.example**.

O valor de **POSTGRES_DB** do .env da raiz precisa ser igual ao nome no final de **DATABASE_URL** em backend/.env. O backend deve apontar para localhost:5433; os scripts recusam outros hosts e NODE_ENV=production. Não copie senhas reais para arquivos versionados.

## Inicializar

    npm run start

O comando sobe ou reutiliza PostgreSQL e Silo no Docker Compose, aplica migrações, carrega os dados de demonstração, compila a API e inicia API e interface no host.

- Interface: [http://localhost:3001](http://localhost:3001)
- Financeiro/Insights: [http://localhost:3001/finance/insights](http://localhost:3001/finance/insights)
- API: [http://localhost:3000](http://localhost:3000)
- PostgreSQL: localhost:5433
- Silo: localhost:9000; console: [http://localhost:9001](http://localhost:9001)

Se Docker exigir privilégios, os comandos de inicialização e desligamento podem solicitar a senha do sudo no terminal. Arquivos de log e PIDs ficam em **.fullhouse/logs/** e **.fullhouse/pids/**.

## Desligar

    npm run stop

Encerra os processos de API/interface iniciados pelo script e para os serviços PostgreSQL e Silo do Compose. Mantém os containers, volumes e dados do banco; não executa docker compose down nem apaga arquivos de dados.

## Inserir os dados de demonstração

    npm run seed:demo

Este comando também aplica migrações pendentes. A carga é repetível: cria registros ausentes, reconhece os já inseridos e não apaga dados do usuário. Os registros demonstrativos usam o prefixo `DEMO —` ou `DEMO INSIGHTS —`; os registros do cenário adicional de dois moradores mantêm `TESTE FULLHOUSE:` para reconhecer execuções anteriores.

O conjunto cobre casa e moradores; tarefas pendentes, atrasadas e concluídas; despesas compartilhadas com cotas pagas e em aberto, pagamentos por morador, subgrupo e série mensal para Insights; itens de despensa; lista de compras pendente e comprada; pet e cuidado veterinário; regra de convivência; reunião com participantes; e mensagens no chat.

## Contas de teste

| Email | Variável da senha local |
| --- | --- |
| demo@example.com | `DEMO_USER_PASSWORD` |
| ana@example.com | `DEMO_USER_PASSWORD` |
| bruno@example.com | `DEMO_USER_PASSWORD` |
| morador.teste@example.com | `HOME_TEST_MEMBER_PASSWORD` |

Use os valores locais definidos em `backend/.env` para essas variáveis. Não imprima nem copie as senhas em arquivos versionados. A carga cria hashes; se uma variável mudar depois da primeira carga, a senha já armazenada para as contas existentes não é alterada automaticamente.

## Arquivos

- **scripts/start.sh**: infraestrutura, migrações, carga, build e inicialização dos processos.
- **scripts/stop.sh**: encerra os processos gerenciados e para os dois serviços Compose.
- **scripts/seed-demo.sh**: valida ambiente local, migrações e carga de dados.
- **scripts/lib.sh**: validações e funções compartilhadas.
- **backend/prisma/seed.mjs**: usuários básicos, dados de Insights, despensa e fixtures dos módulos.
- **backend/prisma/seed-two-person-home-test.mjs**: tarefas, despesas adicionais e usuário de teste.

Se uma porta de API/interface já estiver ocupada por outro processo, o inicializador informa a porta e não encerra esse processo. Feche a execução anterior e rode npm run start novamente. Se um serviço não iniciar, consulte os logs em **.fullhouse/logs/**.
