# Tasks

## 1. Backend message pagination

- [x] 1.1 Add validated `before` and `limit` query parameters to the negotiation messages endpoint, defaulting to 30 and capping at 50; verify valid defaults, bounds, and invalid input through DTO/controller tests.
- [x] 1.2 Implement stable cursor-based repository paging and return `hasMore`/`nextCursor` through the service; add tests for chronological ordering, equal timestamps, empty/final pages, and cursors outside the requested negotiation.
- [x] 1.3 Document the paginated request and response contract in the rooms README and verify the focused backend tests pass.

## 2. Frontend conversation paging and layout

- [x] 2.1 Extend the rooms API client with pagination parameters and response metadata; add API tests verifying the initial and older-page requests.
- [x] 2.2 Add initial-latest loading, automatic and accessible manual loading of older messages, in-flight/error handling, and reading-position preservation to the conversation page; test chronological merging, scroll restoration, and retry behavior.
- [x] 2.3 Constrain the desktop negotiation layout to keep the sidebar visible and the message area independently scrollable while preserving smaller-screen usability; verify through focused component tests.

## 3. Integration verification

- [x] 3.1 Run focused backend and frontend tests plus both production builds; confirm pagination and fixed-sidebar behavior without changes to unrelated room or house conversations.
