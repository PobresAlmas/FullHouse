# Sprint 03 — Requisitos de contextos da Home e de Tarefas

**Responsável:** Denilso<br>
**Módulo:** Home e Tarefas — Casa, Pessoal, privacidade e trocas<br>
**OpenSpec:** [SPEC-006](../../../../../openspec02/spec/006-contextos-home-tarefas/requirements.md)

## 1. Objetivo

Identificar a origem dos atrasos da Home, deixar encontráveis as tarefas pessoais e privadas e informar o resultado de ações e trocas de tarefa.

## 2. Requisitos funcionais

| Referência | Comportamento                                                                                                                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF01       | Mostrar o atraso como dado da casa no contexto Casa. No Pessoal, contar tarefas individuais e tarefas da casa sob responsabilidade da conta.                                                                      |
| RF02       | A tarefa privada da casa é atribuída de forma fixa à conta ao criar. Depois da troca, a lista e o detalhe usam o responsável atual da ocorrência.                                                                 |
| RF03       | Abrir o contexto Pessoal pelo menu, pela Home ou por `/tasks?scope=personal`, inclusive sem casa. Tarefas residenciais atribuídas aparecem como **Da casa** e podem ser concluídas ou reabertas na lista pessoal. |
| RF04       | Mostrar a tarefa que ficará com cada morador antes de aceitar uma troca. A escolha final é registrada com a atribuição e o aviso ao solicitante.                                                                  |
| RF05       | Exibir erros e confirmações na parte visível da tela e focar a mensagem quando o formulário falhar na validação.                                                                                                  |

## 3. Critérios de aceitação

1. Um atraso de outro morador aparece como atraso da casa. Essa tarefa fica fora da lista Pessoal de quem não é responsável.
2. Depois de salvar, o responsável encontra a tarefa privada. Após a troca, somente o novo responsável pode consultá-la.
3. A conta sem casa abre Tarefas Pessoais e mantém a seleção ao recarregar a URL.
4. Ao trocar a sugestão antes do aceite, o pedido e a notificação registram a tarefa efetivamente escolhida.
5. Avatares, seletor de contexto e mensagens de ação permanecem utilizáveis em tela estreita e com teclado.

## 4. Rastreabilidade

- RF018/US016 fundamenta tarefas pessoais e sua privacidade. RF021/US019 fundamenta a troca mediante aceite. RF007/US006 trata da conclusão de tarefas. RN001, RN002 e RNF003 orientam acesso, permissões e responsividade. [Documento de Especificação de Requisitos — FullHouse](<../../../../../docs/Documento de Especificação de Requisitos - FullHouse.pdf>)
- O PDF registra a visibilidade do novo responsável nas trocas da casa. A SPEC-006 detalha a autorização pelo responsável atual para ocorrências privadas.
- [Implementação](implementacao.md), [testes e evidências](testes.md) e [tarefas da SPEC-006](../../../../../openspec02/spec/006-contextos-home-tarefas/tasks.md).
