# Sprint 03 — Implementação de negociação e convites

**Responsável:** Emilson<br>
**Módulo principal:** Quartos — negociação e entrada na residência<br>
**OpenSpec:** [Design da SPEC-004](../../../../../openspec02/spec/004-negociacao-e-convites/design.md)

## 1. Visão geral

O aceite de interesse habilita uma conversa privada. A decisão do convite é uma operação separada, direcionada ao interessado. A implementação de origem foi registrada no commit `0cbc602`.

## 2. Frontend

- [RoomsPage](../../../../../web/features/rooms/components/RoomsPage.tsx) oferece **Meus interesses** com estado e link da negociação quando disponível.
- [RoomNegotiationPage](../../../../../web/features/rooms/components/RoomNegotiationPage.tsx) exibe mensagens e ações de convite, conforme as permissões da resposta.
- [NotificationBell](../../../../../web/features/notifications/components/NotificationBell.tsx) abre a negociação e apresenta ações de convite para o destinatário. A [SPEC-001](../../Denilso/implementacao.md) registra a integração do aceite com a Home e o perfil.

## 3. Backend

| Operação                      | Contrato                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| Consultar interesses próprios | `GET /rooms/negotiations/interests/mine`                                                           |
| Ler e enviar mensagens        | `GET` e `POST /rooms/negotiations/:id/messages`                                                    |
| Convidar e responder          | `POST /rooms/negotiations/:id/invitations` e `PATCH /rooms/negotiations/invitations/:invitationId` |
| Consultar e marcar avisos     | `GET /notifications` e `PATCH /notifications/:id/read`                                             |

O [controlador](../../../../../backend/src/rooms/room-negotiations.controller.ts) usa a conta da sessão. O [serviço de Quartos](../../../../../backend/src/rooms/rooms.service.ts) valida os participantes, o papel de anunciante gestor e o destinatário da ação. A [API de notificações](../../../../../backend/src/notifications/notifications.controller.ts) usa a identidade autenticada e os parâmetros de paginação.

## 4. Regras de persistência e validação

- A [migration](../../../../../backend/prisma/migrations/20261115100000_add_room_negotiations/migration.sql) associa uma negociação ao interesse e liga mensagens e convites à conversa.
- O [repositório de Quartos](../../../../../backend/src/rooms/rooms.repository.ts) grava o aceite do interesse e o aviso correspondente em transação. O aceite do convite também grava o vínculo e a decisão em conjunto.
- No código atual, aceitar o convite fecha a vaga e cancela os demais convites pendentes para ela. A recusa mantém o histórico da conversa e a situação de moradia.
- A lista de avisos sempre usa o destinatário da sessão. O tratamento de um convite depende do estado e da validade.

## 5. Rastreabilidade

- [Requisitos](requisitos.md), [testes](testes.md) e [tarefas da SPEC-004](../../../../../openspec02/spec/004-negociacao-e-convites/tasks.md).
