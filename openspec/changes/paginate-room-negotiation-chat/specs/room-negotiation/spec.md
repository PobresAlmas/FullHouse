# Spec Delta

## Purpose

Provides bounded, chronological history pages for private room negotiations and a responsive conversation layout that keeps long message histories navigable without displacing the desktop sidebar.

## ADDED Requirements

### Requirement: Negotiation message history is paginated

The system SHALL return a bounded page of messages for a negotiation, defaulting to the 30 most recent messages and allowing a requested page size from 1 through 50. The response SHALL include messages in chronological order, indicate whether older messages remain, and provide a cursor for the next older page when one exists. Pagination SHALL use a stable ordering so messages with equal timestamps are neither duplicated nor skipped between pages. A cursor that is malformed or does not identify a message in the requested negotiation SHALL be rejected without exposing another negotiation's messages.

#### Scenario: Participant opens a negotiation with a long history
- **WHEN** a negotiation participant requests messages without a cursor
- **THEN** the system returns at most 30 of the most recent messages in chronological order and indicates whether older messages are available

#### Scenario: Participant requests older messages
- **GIVEN** a participant has a page with older messages available
- **WHEN** they request the page before its oldest message
- **THEN** the system returns only older messages in chronological order, with a cursor for another older page only when one remains

#### Scenario: Participant requests an invalid page
- **WHEN** a participant supplies an invalid page size or a cursor that is malformed or belongs to another negotiation
- **THEN** the system rejects the request and does not return messages outside the requested negotiation

#### Scenario: Unrelated user requests a page
- **WHEN** a user who is not a negotiation participant requests any page of its messages
- **THEN** the system preserves the existing access denial behavior and returns no negotiation data

### Requirement: Long negotiation conversations use a dedicated scroll area

The system SHALL display negotiation messages in chronological order inside a bounded, independently scrollable message area. On desktop layouts the sidebar SHALL remain visible while the user scrolls the conversation, and the message area SHALL load older pages as the user approaches its beginning. Loading older messages SHALL preserve the user's visible reading position. The conversation SHALL provide an accessible way to request older messages and SHALL remain usable on smaller screens.

#### Scenario: Participant reads the initial conversation page
- **WHEN** a participant opens a negotiation
- **THEN** the conversation loads the most recent page and positions the message area at the newest message

#### Scenario: Participant reaches the beginning of the loaded history
- **GIVEN** older messages are available
- **WHEN** the participant scrolls toward the beginning of the message area or activates its load-older control
- **THEN** the conversation prepends an older page, preserves the visible reading position, and continues displaying messages chronologically

#### Scenario: Participant scrolls a long conversation on desktop
- **WHEN** the participant scrolls through negotiation messages on a desktop layout
- **THEN** scrolling remains in the message area and the sidebar remains visible

#### Scenario: Participant uses a smaller screen
- **WHEN** the participant opens and scrolls a negotiation on a smaller screen
- **THEN** the conversation remains navigable and its message history can be scrolled without hiding the composer
