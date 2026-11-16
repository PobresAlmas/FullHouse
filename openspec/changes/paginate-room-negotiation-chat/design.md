# Design

## Context

See `proposal.md` for the motivation and `specs/room-negotiation/spec.md` for the observable behavior. The authenticated message endpoint currently returns the full negotiation history in ascending date/ID order. Its repository, service, and controller follow the existing NestJS controller → service → repository pattern. The React conversation page renders the full message array in the page flow beside the shared sidebar.

## Goals / Non-Goals

**Goals:**
- Bound initial and subsequent message reads without changing message storage.
- Preserve deterministic page boundaries and chronological rendering.
- Keep authorization checks and existing manual conversation refresh behavior intact.
- Confine layout changes to the negotiation page.

**Non-Goals:**
- Realtime transport, polling, or changing notification delivery.
- Pagination for unrelated room, house, or subgroup conversations.
- Database schema changes or deletion/retention policies for messages.

## Decisions

### D1 — Use a validated message-ID cursor with a bounded page size

Add optional `before` and `limit` query parameters to the existing messages endpoint. Default `limit` to 30 and cap it at 50. The repository will verify that a supplied cursor belongs to the requested negotiation, query in descending sent-time and ID order with one extra row to determine whether older messages exist, and reverse the selected page before returning it. The response will include `hasMore` and `nextCursor`; the cursor points to the oldest returned message when another page exists.

This keeps the API stateless and avoids offset pagination, which can shift under concurrent inserts. It also avoids adding a database index or schema migration for the existing unique message ID cursor.

**Alternative considered:** offset/page-number pagination. It is simpler to express but concurrent messages can shift offsets and cause duplicates or omissions while a participant is paging through history.

### D2 — Preserve reading position when prepending pages

The frontend API client will send `before` and `limit` query parameters. The conversation page will request older messages when the scroll area nears its top and expose an explicit accessible load-older control. Before prepending a response, record the scroll container's height and scroll offset; after rendering, adjust the offset by the height delta so the same visible messages remain in place. A single in-flight guard will prevent duplicate requests. A failed request will remain visible and retryable.

The initial/latest page and successfully sent messages will keep the view at the bottom. Existing manual refresh will continue to fetch the latest page.

### D3 — Constrain desktop layout to the viewport

Only the negotiation page will use a viewport-height desktop shell: a sticky, viewport-height sidebar and a flex-column content area with a bounded message scroller. The composer remains outside that scroller. Smaller screens keep document scrolling and use a bounded message area so navigation and message composition remain usable.

**Alternative considered:** changing the shared sidebar component globally. This could alter scrolling on unrelated pages, so the layout adjustment stays in the negotiation page wrapper.

## Risks / Trade-offs

- **A cursor can be replayed against a different negotiation** → Verify cursor ownership against the already-authorized negotiation before querying; reject malformed or unrelated cursors.
- **Messages can share timestamps** → Include message ID as a deterministic secondary ordering key for page boundaries.
- **Scroll height changes can move the reader unexpectedly** → Preserve the scroll offset using the measured height delta and cover this behavior in component tests.
- **The initial page can be shorter than the viewport** → Keep the explicit load-older control available while `hasMore` is true in addition to the scroll trigger.

## Migration Plan

No data migration is needed. Deploy the backward-compatible optional query parameters and response metadata, then deploy the frontend that consumes them. Rollback can restore the frontend to an unpaginated client, but the backend should retain compatible defaults and response fields during that rollback.
