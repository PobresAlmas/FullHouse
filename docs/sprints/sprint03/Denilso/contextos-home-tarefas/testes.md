# Sprint 03 — Testes de contextos da Home e de Tarefas

**Responsável:** Denilso<br>
**Módulo:** Home e Tarefas — Casa, Pessoal, privacidade e trocas<br>
**OpenSpec:** [SPEC-006](../../../../../openspec02/spec/006-contextos-home-tarefas/tasks.md)

## 1. Objetivo e estado da verificação

Conferir o acesso a Casa e Pessoal, a autorização de tarefas privadas, o resultado da troca e as mensagens de ação.

Passaram **66 testes web**, **94 unitários**, **17 HTTP** e **1 teste de integração** em PostgreSQL descartável na revisão de 23/11/2026. A integração confirmou a visibilidade da tarefa privada pelo responsável após a troca.

No Chrome a 390 px, foram verificados atrasos em Casa e Pessoal, recarga, seletor, foco da mensagem de erro via Enter e iniciais dos avatares nos temas claro e escuro. Depois de alterar a tarefa sugerida e aceitar a troca, o novo responsável conseguiu ver a privada e o solicitante recebeu no sino o nome da tarefa escolhida. Uma quarta conta, sem vínculo, abriu Tarefas Pessoais.

## 2. Matriz de testes funcionais

| ID   | Cenário                                       | Resultado esperado                                                        |
| ---- | --------------------------------------------- | ------------------------------------------------------------------------- |
| CT01 | Comparar a Home da casa e a Home pessoal      | O atraso de outro morador entra na contagem da casa.                      |
| CT02 | Criar e trocar uma tarefa privada             | O responsável atual encontra a ocorrência e terceiros ficam sem acesso.   |
| CT03 | Abrir Tarefas Pessoais e recarregar           | O contexto é mantido e a conta sem casa consegue consultar a lista.       |
| CT04 | Aceitar uma troca alterando a tarefa sugerida | A escolha final aparece na confirmação e no aviso do solicitante.         |
| CT05 | Usar tela estreita e teclado                  | O contexto selecionado e as mensagens de validação permanecem acessíveis. |

## 3. Arquivos de teste

- [Home](../../../../../web/features/home/components/__test__/HomePage.test.tsx) e [interface de Tarefas](../../../../../web/features/tasks/components/__test__/TasksPage.test.tsx).
- [Serviço de troca](../../../../../backend/src/tasks/task-exchange.service.spec.ts), [testes unitários de Tarefas](../../../../../backend/test/unit/tasks/) e [Home](../../../../../backend/src/home/home.service.spec.ts).
- [HTTP da Home](../../../../../backend/test/home.e2e-spec.ts), [Tarefas](../../../../../backend/test/tasks.e2e-spec.ts), [Tarefas Pessoais](../../../../../backend/test/personal-tasks.e2e-spec.ts), [trocas](../../../../../backend/test/task-exchange.e2e-spec.ts) e [integração PostgreSQL](../../../../../backend/test/integration/task-exchange.integration.test.ts).

## 4. Comandos para executar os testes

Rode na raiz do FullHouse com Node.js 26.8.1.

```bash
pnpm --dir web exec vitest run features/tasks features/home components/layout/__test__ components/ui/__test__/user-avatar.test.tsx
pnpm --dir backend exec vitest run src/tasks test/unit/tasks src/home
pnpm --dir backend run test:e2e test/home.e2e-spec.ts test/tasks.e2e-spec.ts test/personal-tasks.e2e-spec.ts test/task-exchange.e2e-spec.ts
```

Com `TEST_DATABASE_URL` apontando para um banco descartável com as migrações aplicadas, rode o cenário de troca da ocorrência privada:

```bash
pnpm --dir backend run test:integration:sprint02-migrations test/integration/task-exchange.integration.test.ts -t 'current assignee'
```

## 5. Roteiro de teste manual e evidências

Salve os prints em [`evidencias/`](evidencias/) como `testes-front.png`, `testes-backend.png`, `testes-backend-e2e.png` e, para a integração, `testes-integracao-postgres.png`.

Com três moradores ativos, prepare uma tarefa atrasada de B. Em C, compare Casa e Pessoal. Crie uma tarefa privada com B, troque sua atribuição com C e use A para conferir o isolamento. Abra a lista Pessoal por URL e recarregue. Teste a escolha final da troca, o aviso no sino e o feedback do formulário com teclado em tela estreita. Capture `home-contextos.png`, `tarefas-privacidade.png`, `tarefas-troca.png` e `tarefas-feedback.png`.
