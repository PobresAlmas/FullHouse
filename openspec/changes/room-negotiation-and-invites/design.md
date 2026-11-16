# Design

## Context

See `proposal.md` for the motivation and `specs/room-negotiation/spec.md` for observable behavior. The current room-interest flow stores a status and lets the listing owner accept or decline, but it does not provide the interested person an inbox or conversation. The existing `conversa` model is scoped to a house or subgroup, while `mensagem` authors must be house participations; neither directly supports a private chat with a prospective member. House-invitation and notification tables exist in Prisma, but no corresponding feature APIs or functional notification UI were found. The header bell is currently decorative.

## Goals / Non-Goals

**Goals:**
- Keep interest acceptance, negotiation, invitation, and house membership as separate states.
- Ensure the prospective member can chat before joining and after declining an invitation.
- Restrict negotiation and invitation data to their intended users.
- Reuse existing room-interest, house-invitation, and notification concepts where their current access model fits.

**Non-Goals:**
- WebSocket, push delivery, or guaranteed real-time updates.
- Payments, lease documents, reservation guarantees, or automatic changes to room-listing status.
- Exposing a private negotiation in the general house or subgroup conversation.

## Decisions

### D1 — Add a private conversation type anchored to one room interest

Add a negotiation conversation associated uniquely with an `interesse_anuncio`, with messages authored by authenticated users. Access is limited to the interested user and the listing advertiser. Do not reuse the existing house/subgroup conversation for this flow: its membership and message-author constraints would either block the non-member or expose the negotiation to house members.

Each interest can have at most one negotiation conversation. When acceptance is processed, update the interest and create or retrieve that conversation in one database transaction. Declining an interest does not create one. Older accepted interests without a conversation are preserved; their conversation may be created when first opened, without inventing historical messages or notifications.

### D2 — Preserve independent state for interest, messages, and invitation

`interesse_anuncio.status` remains the advertiser's decision to begin or decline a negotiation. A separate house invitation is tied to both the negotiation and its intended user. Sending an invitation does not end the conversation. Declining or accepting it changes only invitation/membership state; messages remain accessible to the same two users.

Use the existing `convite_casa` record and statuses where possible, adding a relation to the negotiation so the invitation cannot be replayed against a different user, listing, or house. Accepting a pending invitation must atomically verify the recipient and current state, create an active house participation, and mark the invitation accepted. Declining marks it declined without deleting or closing the conversation.

### D3 — Persist in-app notifications without a real-time transport

Use the existing `notificacao` model for accepted-interest and invitation events, linking records to the relevant conversation or invitation through entity references. Load a user's notifications when they open the bell/list and provide actions only for that user's pending invitations. Do not add a WebSocket or external notification dependency; updates become visible on the next notification refresh.

### D4 — Expose a seeker inbox and a private negotiation view

Add a view for authenticated users to see their own interests and statuses, then open accepted negotiations. The administrator continues to review interested people from their own listing. Both entry points open the same private conversation. An invitation action is available in that conversation only to a leader/administrator of the advertised house; only the addressed seeker can answer it.

## Risks / Trade-offs

- **A candidate's messages could leak into a house-wide conversation** → Keep negotiation records separate and authorize every read/write against the exact two participants.
- **Concurrent acceptance or invitation responses could create duplicate state or membership** → Use database transactions and uniqueness/conditional updates for the one-conversation-per-interest and pending-invitation rules.
- **A user could act on another person's notification or invite URL** → Derive identity from the authenticated session and verify recipient ownership server-side on every action.
- **Existing accepted interests have no discussion history** → Preserve their status and create a new empty conversation on first open; do not generate fake messages or retroactive notifications.
- **No real-time transport means delayed badges** → Refresh persisted notifications when the notification UI opens; real-time delivery can be considered separately if needed.

## Migration Plan

1. Add the private conversation/message storage and the foreign-key relation from house invitations; preserve existing room interests, conversations, invitations, and notifications.
2. Deploy APIs that atomically create negotiation state and notifications, enforce participant/manager/recipient authorization, and commit invitation acceptance with house membership.
3. Add the seeker interest inbox, negotiation UI, invitation actions, and functional notification bell.
4. Verify with migrated and legacy records, especially accepted interests without a conversation. Rollback removes only new negotiation relations/tables after dependent new records are handled; it must not delete existing house conversations, interests, or memberships.
