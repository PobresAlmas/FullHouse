# Sprint 03 — Implementação de contextos da Home e de Tarefas

**Responsável:** Denilso<br>
**Módulo principal:** Home e Tarefas<br>
**OpenSpec:** [Design da SPEC-006](../../../../../openspec02/spec/006-contextos-home-tarefas/design.md)

## 1. Visão geral

A entrega trata atrasos por contexto, acesso ao modo Pessoal, visibilidade de tarefas privadas e confirmação das trocas. As alterações da origem estão no commit `c4050ad`.

## 2. Frontend

- [HomePage](../../../../../web/features/home/components/HomePage.tsx) mostra os dados da casa ou da conta e oferece o atalho `/tasks?scope=personal`.
- [TasksPage](../../../../../web/features/tasks/components/TasksPage.tsx) mantém a seleção na URL, limpa filtros ao salvar tarefa, indica **Privada** ou **Da casa** quando aplicável e exibe a prévia com a tarefa final da troca. Mensagens de ação podem ser vistas e dispensadas na posição atual da página.
- [Menu compartilhado](../../../../../web/components/layout/AppSidebar.tsx) oferece Tarefas para contas sem casa. O [sino](../../../../../web/features/notifications/components/NotificationBell.tsx) direciona o aviso de troca para Tarefas.

## 3. Backend

| Operação                                        | Contrato                                                                                                                    |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Consultar a Home Pessoal                        | `GET /home/personal`                                                                                                        |
| Consultar tarefas pessoais e atribuídas da casa | `GET /tasks/personal` e `GET /residences/:residenceId/tasks`                                                                |
| Concluir ou reabrir                             | Usar `PATCH` com `/complete` ou `/reopen` na rota da tarefa pessoal ou residencial, de acordo com a origem.                 |
| Registrar ou responder a troca                  | `POST /residences/:residenceId/task-exchange-requests` e `PATCH /residences/:residenceId/task-exchange-requests/:requestId` |

Os módulos de [Home](../../../../../backend/src/home/) e [Tarefas](../../../../../backend/src/tasks/) usam a identidade autenticada. A lista pessoal reúne tarefas da conta e ocorrências residenciais atribuídas cujo vínculo continua ativo.

## 4. Regras de persistência e validação

- O [repositório de Tarefas](../../../../../backend/src/tasks/tasks.repository.ts) aplica a visibilidade da ocorrência privada ao seu responsável atual.
- O [serviço de troca](../../../../../backend/src/tasks/task-exchange.service.ts) grava as atribuições, a escolha final, a decisão e a notificação `TROCA_TAREFA` em uma transação. Uma operação rejeitada mantém as atribuições anteriores.
- Ações sobre uma ocorrência residencial em Pessoal usam o mesmo contrato de conclusão e reabertura disponível no contexto Casa.

## 5. Rastreabilidade

- [Requisitos](requisitos.md), [testes e evidências](testes.md) e [tarefas da SPEC-006](../../../../../openspec02/spec/006-contextos-home-tarefas/tasks.md).
