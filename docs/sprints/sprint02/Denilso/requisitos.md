# Sprint 02 — Requisitos do painel de tarefas

**Responsável:** Denilso<br>
**Módulo:** Tarefas e rotina<br>
**Change OpenSpec:** `implement-tasks-dashboard`

## 1. Objetivo

Como usuário, quero organizar tarefas da casa e tarefas pessoais em contextos separados. Como morador, quero poder propor a troca de uma tarefa com outro morador e efetivá-la após a aceitação.

## 2. Requisitos funcionais

| Capacidade OpenSpec           | Requisito                                                                                                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `task-dashboard`              | Mostrar o nome da residência e permitir alternar entre a casa e o modo Pessoal. Exibir os filtros **Todas**, **Atrasadas**, **Pendentes** e **Concluídas**, além de busca, categorias e calendário.                      |
| `task-assignment-and-privacy` | Associar cada tarefa a um responsável válido. A pessoa autenticada é a responsável pela tarefa pessoal. Nas tarefas da casa, o servidor valida o vínculo, a política de atribuição e a visibilidade.                     |
| `task-exchange-requests`      | Permitir que um morador ofereça uma tarefa residencial aberta atribuída a ele, com sugestão opcional de uma tarefa pública aberta do destinatário. O destinatário pode escolher a tarefa de retorno, aceitar ou recusar. |

## 3. Critérios de aceitação

1. A tela muda os dados conforme o contexto selecionado. Tarefas pessoais continuam disponíveis ao retornar ao modo **Pessoal** ou atualizar a página.
2. O filtro **Todas** inclui tarefas concluídas. Os outros filtros apresentam as respectivas filas. Busca e categorias podem refinar a lista.
3. Uma tarefa da casa possui responsável com participação ativa. Quando a política restringe a atribuição a terceiros, o responsável é o próprio criador. Tarefas privadas residenciais exigem atribuição fixa ao próprio usuário.
4. A consulta de tarefas pessoais e privadas respeita o escopo e as regras de acesso. Criação e edição apresentam validações sem misturar identificadores de usuário com identificadores de participação.
5. O pedido de troca parte de uma tarefa residencial aberta do solicitante. Só o destinatário responde. A aceitação atualiza as duas responsabilidades em uma transação e a recusa preserva ambas.

## 4. Rastreabilidade

| Requisito / história                           | Relação com a entrega                                                                                                                                                        |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF004 / US003 — Cadastro de tarefas com tags   | Formulário, responsável, tags e cor. Periodicidade, prazos e rodízio integram o fluxo de tarefas.                                                                            |
| RF007 / US006 — Conclusão de tarefas           | A conclusão e seu registro são reaproveitados e refletidos na listagem e nos filtros do painel.                                                                              |
| RF009 e RF010 / US008 — Calendários            | O painel apresenta o calendário de tarefas. O calendário de vencimentos financeiros fica fora do escopo.                                                                     |
| RF018 / US016 — Tarefas e despesas individuais | O painel inclui o fluxo de tarefas pessoais persistidas pela API, inclusive sem residência. Despesas individuais pertencem ao Financeiro.                                    |
| RF021 / US019 — Troca mediante aceitação       | A troca pontual exige aceitação do destinatário. O código mantém as atribuições enquanto houver um pedido pendente e não implementa expiração automática no prazo da tarefa. |
| RF023 / US021 — Controle de permissões         | O módulo aplica as regras de acesso e atribuição da residência. Gerenciar permissões pertence às configurações da casa.                                                      |

- [Documento de Especificação de Requisitos atualizado](../../../Documento%20de%20Especifica%C3%A7%C3%A3o%20de%20Requisitos%20-%20FullHouse.pdf)
- [Proposta](../../../../openspec/changes/implement-tasks-dashboard/proposal.md), [design](../../../../openspec/changes/implement-tasks-dashboard/design.md) e [cenários OpenSpec](../../../../openspec/changes/implement-tasks-dashboard/specs/)
- [Implementação](implementacao.md) e [testes](testes.md)
