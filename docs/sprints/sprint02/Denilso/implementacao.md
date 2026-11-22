# Sprint 02 — Implementação do painel de tarefas

**Responsável:** Denilso<br>
**Módulo:** Tarefas e rotina<br>
**Change OpenSpec:** `implement-tasks-dashboard`

## 1. Visão geral

A rota autenticada `/tasks` reúne a fila, o calendário e o resumo de tarefas. O painel usa a residência cadastrada e mantém o modo Pessoal separado. Esta entrega amplia o módulo de tarefas da Sprint 01 com filtros de status, regras de atribuição e o fluxo de troca.

## 2. Frontend

| Arquivo                                       | Responsabilidade                                                                                                        |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `web/app/(private)/tasks/page.tsx`            | Abre a tela de tarefas dentro da área autenticada.                                                                      |
| `web/features/tasks/components/TasksPage.tsx` | Orquestra contextos, formulário, filtros, calendário e solicitações de troca. Usa o cabeçalho compartilhado com a Home. |
| `web/features/tasks/api/tasks.api.ts`         | Reúne as chamadas HTTP de tarefas residenciais, tarefas pessoais, moradores e trocas.                                   |

No modo residencial, o menu da tarefa elegível abre a seleção de morador e permite sugerir uma tarefa de retorno. Na lista de pedidos recebidos, a sugestão aparece pré-selecionada e o destinatário pode alterá-la antes de aceitar.

## 3. Backend

O módulo `backend/src/tasks/` concentra os controllers, DTOs, serviço e repositório. As rotas exigem autenticação, e as operações residenciais validam a participação na casa.

| Método                   | Rota                                                         | Função                                                                   |
| ------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `GET`                    | `/residences/:residenceId/tasks/members`                     | Lista moradores ativos para atribuições e trocas.                        |
| `GET`, `POST`            | `/residences/:residenceId/tasks`                             | Lista e cria tarefas da residência.                                      |
| `GET`, `PATCH`, `DELETE` | `/residences/:residenceId/tasks/:taskId`                     | Consulta, edita ou remove uma tarefa residencial conforme as permissões. |
| `GET`, `POST`            | `/tasks/personal`                                            | Lista e cria tarefas pessoais da conta autenticada.                      |
| `GET`, `PATCH`, `DELETE` | `/tasks/personal/:taskId`                                    | Consulta, edita ou remove uma tarefa pessoal.                            |
| `PATCH`                  | Sufixo `/:taskId/complete` nas duas coleções de tarefas      | Registra a conclusão da ocorrência.                                      |
| `GET`, `POST`            | `/residences/:residenceId/task-exchange-requests`            | Lista os pedidos do morador e cria uma solicitação pontual.              |
| `PATCH`                  | `/residences/:residenceId/task-exchange-requests/:requestId` | Aceita ou recusa uma solicitação como destinatário.                      |

## 4. Regras de persistência e validação

- `TasksService` aplica as regras de atribuição, consulta e escrita. Tarefas pessoais são persistidas no banco com a identidade obtida pela sessão. Tarefas da casa usam o identificador da participação para atribuição.
- `TaskExchangeService` verifica que as tarefas selecionadas continuam abertas, pertencem à mesma casa e ainda estão atribuídas aos participantes. A aceitação altera as duas instâncias e o status do pedido na mesma transação.
- A migration `20261101000000_add_task_exchange_target` adiciona uma referência opcional à segunda instância em `solicitacao_troca_tarefa`. O campo opcional preserva os pedidos antigos e os pedidos sem sugestão.
- A troca é pontual. As regras de recorrência das definições permanecem válidas e o serviço não expira pedidos automaticamente. O filtro **Pendentes** também usa a data de vencimento, o que pode incluir tarefas já concluídas cujo prazo passou.

## 5. Rastreabilidade

| Entrega                         | Referência                                                                                                                        |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Contextos, filtros e cabeçalho  | [`task-dashboard`](../../../../openspec/changes/implement-tasks-dashboard/specs/task-dashboard/spec.md)                           |
| Responsáveis e privacidade      | [`task-assignment-and-privacy`](../../../../openspec/changes/implement-tasks-dashboard/specs/task-assignment-and-privacy/spec.md) |
| Solicitação e resposta de troca | [`task-exchange-requests`](../../../../openspec/changes/implement-tasks-dashboard/specs/task-exchange-requests/spec.md)           |

Os cenários e comandos estão em [testes.md](testes.md).
