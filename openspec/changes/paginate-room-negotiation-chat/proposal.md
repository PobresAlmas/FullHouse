# Proposal

## Why

Long room-negotiation conversations currently load every message at once and make the page scroll, pushing the sidebar out of view. Loading recent messages first and letting people retrieve older history on demand will keep the conversation responsive and easier to navigate.

## What Changes

- Return a bounded, newest-first page of negotiation messages with a stable cursor for loading older history.
- Add an initial page and load older messages as the user scrolls toward the beginning of the conversation, preserving the visible reading position.
- Keep the chat message list in its own scroll area and keep the sidebar fixed in the desktop conversation layout; retain usable scrolling on smaller screens.
- Keep messages in chronological display order and preserve existing authorization and manual refresh behavior.

## Capabilities

### New Capabilities

- `room-negotiation`: Paginated private conversation history and a dedicated, responsive scrolling layout.

### Modified Capabilities

None.

## Impact

- Backend: negotiation-message query DTO, repository cursor pagination, service response metadata, controller query parameters, and room API documentation.
- Frontend: negotiation API client and conversation page scroll/pagination state.
- Tests: focused backend repository/service and frontend conversation/API coverage.
- No new dependencies, real-time transport, or changes to house-wide conversations.
