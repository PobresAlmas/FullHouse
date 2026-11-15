# Design

## Context

The Prisma schema already contains `conversa`, `mensagem`, `leitura_conversa`, `regra_convivencia`, `proposta_regra`, `reuniao`, and `participante_reuniao`. These models are not currently exposed by application modules or private pages. The chat needs a server-to-client live channel; Nest already uses cookie-based JWT authentication and RxJS is already present in the backend dependency graph.

See `proposal.md` for motivation and `specs/` for the observable requirements.

## Goals / Non-Goals

**Goals:**

- Implement the three requirements on existing residence and participation data, enforcing residence isolation at every request and live connection.
- Reuse the existing Prisma records for messages, rules, meetings, and invitations.
- Deliver new chat messages to currently connected members and recover history after reconnecting.

**Non-Goals:**

- General notifications, push or email delivery, presence indicators, typing status, message reactions, or direct messages.
- Subgroup-specific rules or chats, voting workflows for rule changes, and meeting video/audio calls.
- Multi-instance message fan-out; the current service runs as one backend process. A shared broker can be introduced if deployment later scales horizontally.

## Decisions

### 1. Use the existing residence membership as the authorization source

Resolve the user's active `participacao` in the requested `casa` for chat, rule, and meeting operations. Do not trust a client-supplied participation ID or the existence of a conversation, rule, meeting, or invitation as proof of current membership. Validate an invitation response against both active residence membership and the meeting's `participante_reuniao` record.

This reuses the same house boundary as other modules and prevents identifier guessing from exposing data across residences. HTTP requests use the existing JWT guard and consistent `401`/`403`/`404` behavior; writes continue through the existing origin protection.

### 2. Use REST for chat history and sends, with Server-Sent Events for incoming messages

Expose authenticated REST operations to resolve the residence conversation, retrieve ordered history, and persist a message. Add an authenticated SSE endpoint for live messages. SSE is one-way, which matches the requirement: clients send through REST and receive server-pushed events. It uses the existing RxJS dependency and avoids introducing a WebSocket library or maintaining a second protocol for message creation.

The SSE connection is opened with credentials so the existing HTTP-only JWT cookie can authenticate it. The gateway verifies active membership when connecting and closes or stops delivery when participation is revoked. Events carry the persisted message ID as their event ID. On reconnect, the client fetches history after its last received ID so a dropped connection does not silently lose messages.

The backend broadcasts only after the database transaction commits. The live channel is grouped by conversation ID and removed on disconnect. It is an in-process fan-out; horizontal scaling would require a shared pub/sub adapter and is outside this change.

### 3. Keep one residence conversation while preserving subgroup conversations

Use `conversa` with `tipo = CASA` and the residence ID for the group chat. Continue to leave `tipo = SUBGRUPO` and `subgrupo_id` behavior untouched. Resolve or create the house conversation on demand.

The schema does not currently enforce one `CASA` conversation per residence. Add a partial unique PostgreSQL index scoped to `tipo = CASA` if migration inspection confirms the current database is compatible. The migration must fail with an actionable diagnostic if duplicate house conversations already exist; it must not merge or delete message history automatically. Creation handles a concurrent unique conflict by loading the already-created conversation.

### 4. Use `regra_convivencia` for the residence rule board without invoking proposal voting

Store house mural entries with `escopo = CASA`, `status = VIGENTE`, the current residence, and the authenticated creator. Use `criada_por_participacao_id` for original authorship and `atualizada_por_participacao_id` for the last editor; on a rule that has never been edited, display the creator as its last editor. Record the registration time using the existing `criado_em` default.

Any active residence member may create and edit a residence rule, following the user story's "morador" role and the explicit requirement to attribute the last editor. Do not create proposals or votes: those are separate schema capabilities not requested by RF012. The board filters to current house rules and excludes revoked rules from the default view.

The current model has all required fields, so no rule-table migration is planned.

### 5. Use meeting and participant records transactionally

Create a `reuniao` and pending `participante_reuniao` records for all active residence memberships in one transaction, including the organizer. Persist the submitted agenda in `pauta`; because the current schema requires `titulo` but the requirement does not call for a separate title, derive a concise title from the first 150 characters of the agenda instead of asking for redundant input.

Responses update only the authenticated member's invitation and set `respondido_em`. Rescheduling retains the original meeting with status `REAGENDADA`, creates a linked replacement through `reagendada_de_id`, and creates fresh pending invitations for all current members in one transaction. Cancellation marks the existing meeting `CANCELADA`; neither action deletes history. Only `criada_por_participacao_id` may reschedule or cancel.

Use ISO-8601 timestamps with an explicit offset at the API boundary and PostgreSQL `timestamptz` for persistence. The existing meeting and participant models represent these behaviors, so no schema migration is planned for them.

### 6. Add dedicated backend modules and private frontend pages

Keep backend responsibilities separated into `chat`, `house-rules`, and `meetings` modules, with controllers, services, repositories, and DTOs following neighboring Nest modules. Add corresponding private pages and API clients, and link them through the existing private navigation. Shared residence selection and active-membership checks should reuse existing residence access services where their APIs fit.

This keeps authorization and validation testable without coupling the three capabilities into one catch-all service. Add unit tests for service/repository rules, HTTP tests for authentication and authorization contracts, UI tests for the principal workflows, and focused tests for SSE connect, delivery, isolation, and disconnect cleanup.

## Risks / Trade-offs

- [A cookie-authenticated SSE connection can remain open after a membership change] → Check membership for each delivery or close streams when membership removal is processed, and test that revoked members receive no later events.
- [An in-process event stream does not fan out between multiple backend instances] → Document the single-process deployment assumption; introduce a shared broker before horizontal scaling.
- [Existing databases may contain duplicate `CASA` conversations] → Have the migration detect duplicates and stop without modifying message history; provide the conflicting IDs for an explicit cleanup decision.
- [A member may leave after receiving a meeting invitation] → Keep past response data for history while requiring active membership for all reads and writes; do not allow a former member to respond.
- [Concurrent rule edits can overwrite a recent change] → Use an atomic update with membership validation and update the editor attribution in the same write; consider optimistic versioning only if concurrent-edit behavior becomes a requirement.

## Migration Plan

1. Inspect existing `CASA` conversations for duplicate residence records before applying the optional partial unique index migration. If duplicates exist, stop and preserve all message data for manual resolution.
2. Apply the additive migration for the unique index only after duplicate checks pass; no data reset or table replacement is required.
3. Deploy backend modules before frontend pages, then release the UI using the authenticated endpoints and SSE stream.
4. Roll back by removing the UI routes and backend modules. The migration rollback drops only the partial unique index; it does not delete conversations or messages.

The rules and meetings capabilities reuse existing columns and enums. If code inspection during implementation finds that a schema change is necessary, add a separate additive migration and document its rollback in its task before applying it.
