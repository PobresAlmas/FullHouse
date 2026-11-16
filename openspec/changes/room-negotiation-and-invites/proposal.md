# Proposal

## Why

Room interest currently records only an `ACEITO` or `RECUSADO` status, leaving the person seeking housing without a useful next step. Finding a room is a negotiation: accepting interest should open a private conversation, and a separate invitation should be the explicit step that admits someone to the house.

## What Changes

- Let the interested person track their requests and open a private negotiation conversation after the house leader or administrator accepts their interest.
- Keep accepting interest non-binding: it does not reserve a room or add the person to the house.
- Let the house leader or administrator send an invitation to join the house from the conversation.
- Deliver a persistent in-app notification containing accept/decline actions to the invitee.
- Make accepting the invitation create an active house membership; declining it must not close or delete the negotiation conversation.
- Keep the conversation private to the advertiser and interested person, including after the invitee joins the house.

## Capabilities

### New Capabilities

- `room-negotiation`: private room-interest conversations, house invitations from those conversations, and notifications/status visibility for both participants.

### Modified Capabilities

None. The project currently has no main specs; this behavior is captured as a new capability rather than as an existing spec delta.

## Impact

- Backend: rooms/interests, conversation and message APIs, house invitations, membership creation, and in-app notification APIs.
- Frontend: room-interest status for seekers, private conversation UI, invite actions, and a functional notification bell.
- Data: extend existing room-interest, conversation/message, house-invitation, and notification models as needed. Existing conversation rows are scoped to a house or subgroup and messages require a house participation, so private conversations with non-members need explicit support.
- No external messaging service or real-time transport is assumed; notifications are persisted and available in-app.
