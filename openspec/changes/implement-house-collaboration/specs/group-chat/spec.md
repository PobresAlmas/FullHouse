# Spec Delta

## Purpose

Provide a residence chat so active residents can exchange household messages in the application and receive new messages while connected to the conversation.

## ADDED Requirements

### Requirement: Chat access is limited to active residence members

The system MUST allow only users with an active participation in a residence to retrieve that residence's conversation and its messages or to join its live message stream.

#### Scenario: Active member opens the residence conversation

- **WHEN** an authenticated active member requests the conversation for a residence
- **THEN** the system returns the conversation and its message history for that residence

#### Scenario: User without active membership requests chat data

- **WHEN** an authenticated user without active participation requests the conversation, its messages, or its live stream
- **THEN** the system denies access and returns no conversation content

#### Scenario: Access ends while a live stream is connected

- **WHEN** a member's active participation ends while their live stream is open
- **THEN** the system closes the stream and sends no subsequent messages to that user

### Requirement: Members can send and read attributed messages

The system MUST let an active residence member send a non-empty message and MUST show each message's author and sending date and time to authorized members.

#### Scenario: Member sends a message

- **WHEN** an active member submits a message containing non-whitespace text to their residence conversation
- **THEN** the system stores the message with the authenticated member as author and a server-generated sending timestamp
- **AND** the message appears in the conversation history with that author, date, and time

#### Scenario: Member submits an empty message

- **WHEN** an active member submits a message containing only whitespace
- **THEN** the system rejects the message without storing it

#### Scenario: Member reads conversation history

- **WHEN** an active member requests messages for their residence conversation
- **THEN** the system returns messages in chronological order with author and timestamp

### Requirement: Connected members receive new messages without reloading

The system MUST deliver a persisted new message to other active members currently connected to the same residence conversation without requiring a page reload.

#### Scenario: New message arrives while members are connected

- **WHEN** an active member sends a message while another active member is connected to the same conversation
- **THEN** the sender receives the persisted message through the normal send response
- **AND** the other connected member receives that message through the live channel without reloading

#### Scenario: Message belongs to a different residence

- **WHEN** a message is sent in one residence conversation
- **THEN** connected members of other residences do not receive it
