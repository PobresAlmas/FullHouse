# SPEC-008 — Inicialização local e dados de demonstração

## Objetivo

Disponibilizar comandos reproduzíveis para iniciar e desligar o FullHouse localmente e popular as telas principais com contas e dados de demonstração persistidos no PostgreSQL.

## Requisitos funcionais

- **RF01 — Inicialização completa.** Um comando na raiz inicia PostgreSQL e Silo pelo Compose, aplica as migrações, insere os dados de demonstração e inicia API e interface nas portas padrão.
- **RF02 — Execução repetível.** Reexecutar a inicialização reconhece serviços já ativos, não inicia cópias adicionais e preserva volumes e dados.
- **RF03 — Desligamento.** Um comando para os processos iniciados e os serviços locais sem remover containers, volumes ou registros do banco.
- **RF04 — Carga de demonstração.** Um comando independente cria contas básicas e dados visíveis nos módulos de residência, tarefas, Financeiro/Insights, Despensa, Compras, Pets, Regras, Reuniões e Chat. A carga principal usa prefixo `DEMO`; o cenário existente de dois moradores mantém `TESTE FULLHOUSE:` para reconhecer e preservar execuções anteriores. Carga repetida não duplica nem sobrescreve dados existentes.
- **RF05 — Credenciais documentadas.** As contas de demonstração são autenticáveis por senhas definidas em variáveis locais; senhas não são impressas nem fixadas no código.
- **RF06 — Diagnóstico.** O guia informa portas, arquivos de log, localização dos scripts, requisitos e comando para cada operação.

## Requisitos não funcionais

- **RNF01 — Segurança local.** A carga exige PostgreSQL local e recusa `NODE_ENV=production`; a inicialização não executa comandos destrutivos como `docker compose down -v`.
- **RNF02 — Preservação.** O seed é aditivo e transacional. Registros sem o prefixo de demonstração permanecem intactos.
- **RNF03 — Compatibilidade com o workspace.** A configuração do backend e o nome do banco do Compose precisam apontar para o mesmo banco local.
- **RNF04 — Rastreabilidade.** PIDs, logs e build temporário ficam em `.fullhouse/`, ignorado pelo Git.

## Critérios de aceitação

- **CA01.** `npm run start` sobe ou reutiliza infraestrutura e API/interface; os endereços locais documentados respondem HTTP 200.
- **CA02.** `npm run seed:demo` aplica migrações pendentes e cria os dados básicos sem apagar tabelas ou registros.
- **CA03.** Há contas de demonstração com email e senha documentados por variável de ambiente.
- **CA04.** Após a carga, uma conta demo acessa dados em Financeiro/Insights, Tarefas, Despensa, Compras, Pets, Regras, Reuniões e Chat.
- **CA05.** `npm run stop` para os processos e containers preservando o banco e os volumes; uma inicialização posterior continua encontrando os dados.
- **CA06.** Uma falha de configuração ou serviço indisponível apresenta uma mensagem com o passo de correção e não apaga dados.
