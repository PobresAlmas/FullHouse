# SPEC-002 — Tarefas

Use este checklist como pedido de implementação. Consulte [requirements.md](requirements.md) e [design.md](design.md) antes de começar. Os estados foram preservados da change de origem.

## Chat da residência — backend e persistência

- [x] **T01 — Unicidade da conversa da casa.** Criar a migração para unicidade de uma conversa `CASA` por residência. Incluir verificação de duplicatas existentes e teste de migração que confirme falha segura sem apagar mensagens. **Refs:** RF01, RNF02, CA01.
- [x] **T02 — Histórico e envio REST.** Implementar módulo, DTOs e rotas REST do chat para obter histórico e enviar mensagens. Validar participação ativa, conteúdo não vazio, autoria autenticada e ordenação cronológica, com testes unitários para autorização, isolamento entre casas e validações. **Refs:** RF01–RF02, RNF01, CA01–CA02.
- [x] **T03 — Distribuição SSE.** Implementar o fluxo SSE autenticado para novas mensagens, com associação ao canal da conversa, limpeza na desconexão e interrupção após perda de participação. Cobrir conexão autorizada/negada, entrega sem cruzamento de casas e revogação em testes. **Refs:** RF03, RNF01–RNF02, CA03.
- [x] **T04 — Contrato HTTP do chat.** Adicionar testes HTTP das rotas REST e do fluxo para respostas `401`, `403`, `404` e corpos de requisição inválidos. Executar a suíte E2E do chat. **Refs:** RF01–RF03, RNF01, CA01–CA03.

## Chat da residência — frontend

- [x] **T05 — Cliente e página do chat.** Criar cliente HTTP e página privada do chat com histórico, autor, data/hora, envio e reconexão do fluxo com recuperação das mensagens após o último ID. Testar a API cliente. **Refs:** RF01–RF03, CA02–CA03.
- [x] **T06 — Navegação e entrega ao vivo.** Integrar o chat à navegação e à seleção de residência, exibindo mensagens novas sem recarregar e estado de conexão/desconexão. Testar envio, recebimento ao vivo, reconexão e isolamento do contexto da casa. **Refs:** RF03, RNF01, CA01, CA03.

## Mural de regras

- [x] **T07 — Persistência e autoria das regras.** Implementar rotas, DTOs, serviço e repositório para listar, criar e editar regras `CASA` vigentes, preenchendo criação/última edição com a participação autenticada. Testar campos obrigatórios, autoria, acesso de membros e isolamento residencial. **Refs:** RF04–RF05, RNF01, CA04–CA05.
- [x] **T08 — Contrato HTTP do mural.** Adicionar testes HTTP para mural e edição de regras, incluindo autenticação, membro sem vínculo e recurso inexistente. Executar a suíte E2E de regras. **Refs:** RF04–RF05, RNF01, CA04–CA05.
- [x] **T09 — Cliente e página do mural.** Criar cliente e página privada do mural para consultar, cadastrar e editar título/descrição, exibindo data, criador e último editor. Testar os fluxos e erros de formulário na interface. **Refs:** RF04–RF05, CA04–CA05.
- [x] **T10 — Navegação e regras vigentes.** Adicionar o mural à navegação privada e validar que regras revogadas não aparecem no mural padrão. Testar a navegação e o filtro de status. **Refs:** RF04, CA04.

## Reuniões da residência

- [x] **T11 — Agendamento e convites.** Implementar rotas, DTOs, serviço e repositório para criar reunião e convites pendentes para todos os membros ativos em uma transação. Validar data/hora futura e pauta. Testar organizador, convites completos, validações e reversão em caso de erro. **Refs:** RF06, RNF02, CA06.
- [x] **T12 — Respostas e participantes.** Implementar respostas confirmar/recusar e consulta de participantes, permitindo resposta somente ao membro ativo convidado. Testar status, data de resposta e bloqueio de não convidados/não membros. **Refs:** RF07, RNF01, CA07.
- [x] **T13 — Reagendamento e cancelamento.** Implementar reagendamento com histórico e novos convites pendentes e cancelamento pelo organizador. Testar vínculo da reunião substituta, preservação do evento anterior e bloqueio de ações por outros membros. **Refs:** RF08, RNF02, CA08–CA09.
- [x] **T14 — Contrato HTTP de reuniões.** Adicionar testes HTTP para criação, consulta, resposta, reagendamento e cancelamento, cobrindo autenticação e códigos `400`, `401`, `403` e `404`. Executar a suíte E2E de reuniões. **Refs:** RF06–RF08, RNF01, CA06–CA09.
- [x] **T15 — Cliente e página de reuniões.** Criar cliente e página privada de reuniões para marcar, consultar, responder, reagendar e cancelar eventos. Testar os fluxos, erros e permissões na interface. **Refs:** RF06–RF08, CA06–CA09.
- [x] **T16 — Navegação e histórico de reuniões.** Integrar reuniões à navegação privada e exibir situação da reunião e resposta de cada participante. Testar reunião cancelada/reagendada e atualização da lista. **Refs:** RF07–RF08, CA07–CA09.

## Integração

- [x] **T17 — Verificação das APIs.** Verificar consistência dos três contratos HTTP e autorização baseada em participação ativa. Executar testes unitários e E2E dos módulos chat, regras e reuniões. **Refs:** RNF01–RNF02, CA01–CA09.
- [x] **T18 — Verificação web e builds.** Executar testes web dos três fluxos e builds do backend/frontend. Corrigir falhas e registrar os comandos/resultados de verificação na documentação da Sprint 2. **Refs:** RF01–RF08, CA01–CA09.

## G05 — Permissões do mural

- [x] **T19 — Revalidar autorização do mural em G05.3.** Conferir consulta por membro ativo, escrita reservada a gestores e bloqueio de contas sem vínculo. **Refs:** RF04, RF05, CA04, CA05.

A suíte HTTP do mural, os testes da interface e a verificação com contas distintas passaram. O resultado está na [triagem de G05](../../../docs/triagem-testes-manuais.md#verificação-de-g05--23112026).

## Verificação registrada na Sprint 02

O [registro de testes da colaboração](../../../docs/sprints/sprint02/Iago/colaboracao-casa/testes.md) reúne os comandos, resultados e limites da execução original.

| Área                                        | Resultado registrado                                                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Backend unitário de chat, regras e reuniões | 7 arquivos e 25 testes aprovados.                                                                                             |
| Backend HTTP de chat, regras e reuniões     | 3 arquivos e 10 testes aprovados.                                                                                             |
| Frontend completo                           | 60 arquivos e 189 testes aprovados.                                                                                           |
| Builds e checagens                          | Build Nest, build Next com webpack, tipos do frontend, lint e validação OpenSpec concluídos conforme o registro da Sprint 02. |
| Migração do chat                            | Dois cenários ignorados na execução original sem `TEST_DATABASE_URL`. A verificação com PostgreSQL requer banco de teste.     |
