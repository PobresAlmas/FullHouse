# Sprint 03 — Implementação de paginação da negociação

**Responsável:** Emilson<br>
**Módulo principal:** Quartos — histórico da conversa privada<br>
**OpenSpec:** [Design da SPEC-005](../../../../../openspec02/spec/005-paginacao-da-negociacao/design.md)

## 1. Visão geral

A consulta de mensagens da negociação recupera primeiro a página mais recente. Páginas anteriores usam um cursor de mensagem. A implementação de origem foi registrada no commit `0cbc602`.

## 2. Frontend

O [cliente HTTP](../../../../../web/features/rooms/api/rooms.api.ts) envia `before` e `limit`. A [página de negociação](../../../../../web/features/rooms/components/RoomNegotiationPage.tsx) solicita mais registros ao aproximar-se do topo ou pelo botão **Carregar mensagens anteriores**. Ela combina mensagens por ID e ajusta a rolagem após inserir a página. O compositor fica fora da área rolável.

## 3. Backend

O [controlador](../../../../../backend/src/rooms/room-negotiations.controller.ts) recebe `GET /rooms/negotiations/:id/messages?limit=30&before=<id>`. O [DTO](../../../../../backend/src/rooms/dto/room-negotiation-messages-query.dto.ts) valida o cursor e o limite. O [serviço](../../../../../backend/src/rooms/rooms.service.ts) confere os participantes da negociação e retorna `mensagens`, `hasMore` e `nextCursor`.

## 4. Regras de persistência e validação

O [repositório](../../../../../backend/src/rooms/rooms.repository.ts) confere se o cursor pertence à conversa, ordena por data e ID e busca um item extra para saber se existe outra página. A resposta devolve a página em ordem cronológica. O modelo de mensagens é o da SPEC-004.

## 5. Rastreabilidade

- [Requisitos](requisitos.md), [testes](testes.md) e [tarefas da SPEC-005](../../../../../openspec02/spec/005-paginacao-da-negociacao/tasks.md).
