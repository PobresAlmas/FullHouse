# Tasks

## 1. Negotiation persistence

- [x] 1.1 Add private negotiation-conversation and message models linked to one room interest, plus the invitation relation; preserve existing house/subgroup conversations and verify Prisma schema generation and migration tests with legacy room-interest records.

## 2. Interest acceptance and private messaging APIs

- [x] 2.1 Update interest acceptance to atomically create or reuse one negotiation conversation and notify the interested user; verify accepted/declined, idempotency, and transaction rollback with RoomsService tests.
- [x] 2.2 Add an authenticated endpoint for users to list their own interests and statuses, including accepted conversations; verify one user's results never include another user's interests.
- [x] 2.3 Add authenticated read/send-message endpoints for negotiation participants; verify the advertiser and interested user can exchange messages while nonparticipants receive forbidden/not-found responses.
- [x] 2.4 Document the interest-inbox and negotiation-message API contracts in the room module README and verify documented payloads against controller DTO tests.

## 3. House invitation lifecycle

- [x] 3.1 Add an invitation-send action for the advertised house's leader/administrator, bound to the conversation's exact interested user; verify non-managers and unrelated users cannot send invites.
- [x] 3.2 Implement recipient-only accept/decline actions; on acceptance, atomically activate house membership and mark the invitation accepted, and on decline leave membership unchanged and conversation open; verify both paths and duplicate concurrent responses in service tests.
- [x] 3.3 Add invitation API contract documentation and E2E tests covering authorization, accepted membership, declined invitation, and continued conversation access.

## 4. Persistent notification API

- [x] 4.1 Add authenticated list/read operations for the signed-in user's notifications, with links/actions for accepted interests and pending room invitations; verify notifications cannot be read or acted on by another user.
- [x] 4.2 Cover notification persistence and invitation actions with focused repository/service tests and document the notification response contract.

## 5. Seeker and advertiser experience

- [x] 5.1 Add a seeker-facing view of submitted interests and their statuses, with a link to each accepted negotiation; verify pending, accepted, and declined states in frontend tests.
- [x] 5.2 Add the private negotiation conversation UI and leader/administrator-only invitation action; verify both roles can negotiate as participants, only managers can invite, and the conversation remains accessible after invite decline or acceptance.
- [x] 5.3 Make the header bell display persisted notifications and provide invitation accept/decline actions; verify pending actions are actionable and handled notifications no longer offer duplicate responses.

## 6. End-to-end verification

- [x] 6.1 Run focused backend unit/E2E tests and frontend tests for interest, negotiation, invitation, notification, and access-control flows; resolve regressions in the touched modules.
- [x] 6.2 Run backend and frontend production builds and OpenSpec strict validation; confirm the full negotiation-to-membership flow preserves the conversation and existing house chat behavior.
