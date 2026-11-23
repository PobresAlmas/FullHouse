# SPEC-006 — Design

## Dependências

- [HomePage](../../../web/features/home/components/HomePage.tsx), [TasksPage](../../../web/features/tasks/components/TasksPage.tsx) e navegação compartilhada.
- Consultas autenticadas de tarefas pessoais em `/tasks/personal` e da casa em `/residences/:residenceId/tasks`.
- [TaskExchangeService](../../../backend/src/tasks/task-exchange.service.ts) e o [sino de Notificações](../../../web/features/notifications/components/NotificationBell.tsx).

## Fluxo principal

1. A Home identifica a origem da contagem e aponta a lista pessoal para `/tasks?scope=personal`.
2. Tarefas abre o contexto selecionado e consulta o recurso correspondente. A URL registra a seleção pessoal. Respostas iniciadas no contexto anterior são descartadas. Os botões mantêm a mesma altura e largura ao trocar de contexto.
3. O formulário de tarefa privada da casa fixa o responsável na participação autenticada e oculta as opções incompatíveis. Ao salvar, a lista volta a **Todas** sem busca, data ou filtro de categoria, e a linha traz o rótulo **Privada**.
4. A API pessoal reúne as tarefas individuais e as ocorrências da casa atribuídas à conta. A linha residencial mostra **Da casa** no modo Pessoal e usa a API da residência para concluir ou reabrir a ocorrência. Editar e excluir tarefas residenciais são ações do modo Casa.
5. A escolha do destinatário atualiza a prévia da troca. A API efetiva a mudança e registra o resultado no aviso `TROCA_TAREFA` da conta do solicitante ativo. A lista e a consulta por ID verificam a atribuição atual da ocorrência para exibir tarefas privadas.
6. A lista usa o avatar de perfil do responsável. Se a foto estiver ausente ou falhar, exibe a inicial sobre a cor escolhida com contraste para os dois temas.

## Fluxos alternativos

- Se a pessoa não tem residência, a Home oferece Início e Pessoal, e Tarefas abre no modo Pessoal. Se a consulta de residência falhar em Tarefas, emitir um aviso e consultar a lista pessoal.
- Quando os filtros não retornarem tarefas, diferenciar a busca vazia de uma lista pessoal sem registros e oferecer **Limpar filtros**.
- Falhas de ação aparecem junto à área visível, em uma mensagem dispensável. No formulário, a validação desloca o foco para a mensagem.
- Se a troca falhar por permissão, disponibilidade ou concorrência, a transação não cria uma confirmação.

## Integração e persistência

O servidor continua sendo a fonte de autorização de tarefas privadas e pessoais. O aviso reaproveita a tabela de notificações e o acesso existente a `/tasks` pelo sino. O aceite grava as atribuições, o estado da solicitação, a tarefa final selecionada e a notificação em uma única transação.

## Rastreabilidade

| Triagem | Requisito | Critério |
| ------- | --------- | -------- |
| G02.1   | RF01      | CA01     |
| G02.2   | RF02      | CA02     |
| G02.3   | RF03      | CA03     |
| G02.4   | RF04      | CA04     |
| G02.5   | RF05      | CA05     |
