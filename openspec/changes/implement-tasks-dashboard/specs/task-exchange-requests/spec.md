# Task Exchange Requests Specification

## Purpose

Define authorized requests to exchange responsibility for a task between residents.

## ADDED Requirements

### Requirement: Resident requests an exchange from the task row
The task represented by the row SHALL be the requester's offered instance. A single exchange icon SHALL open a compact exchange composer for another active resident from the same residence. The requester MAY optionally suggest one open, public residence task assigned to that recipient. Leaving the suggestion empty SHALL allow the recipient to decide which of their own tasks to exchange. The requester identity SHALL come from authentication, not a client-supplied identifier.

#### Scenario: User opens the compact exchange menu
- **WHEN** the user activates the exchange icon on an open residence task assigned to them
- **THEN** a compact composer lists active residents of that residence other than the authenticated user and offers an optional task suggestion after a recipient is selected

#### Scenario: Residents have identical display names
- **WHEN** two or more residents share the same display name in the exchange menu
- **THEN** each option includes an additional authorized identifier so the user can distinguish the recipients

#### Scenario: User sends a request without a task suggestion
- **WHEN** the user selects an active resident and leaves the optional task suggestion empty
- **THEN** the system creates a pending request for the task in the row and the recipient chooses a task when responding

#### Scenario: User suggests a task assigned to the recipient
- **WHEN** the user selects an open, public residence task assigned to the selected recipient
- **THEN** the request includes that task as a suggestion and the recipient sees it preselected when responding

#### Scenario: User suggests an unavailable or private task
- **WHEN** the suggested task is not open, is private, is personal, belongs to another residence, or is not assigned to the selected recipient
- **THEN** the server rejects the request and does not disclose task details

#### Scenario: Request references an inactive or foreign recipient
- **WHEN** the recipient is inactive or belongs to another residence
- **THEN** the request is rejected and no exchange is recorded

### Requirement: Exchange eligibility
Any open residence task instance assigned to the authenticated user SHALL be exchangeable, including private, recurring, and rotation instances. Personal, completed, and canceled tasks SHALL NOT be exchangeable.

#### Scenario: User exchanges a private task they own
- **WHEN** the responsible user requests an exchange for an open private residence task
- **THEN** the recipient receives only the minimum details needed to respond; the task stays out of their general list until its responsibility changes

#### Scenario: User exchanges a recurring or rotation instance
- **WHEN** the responsible user requests an exchange for an open recurring or rotation instance
- **THEN** only that instance is exchanged and the recurrence definition and rotation queue remain unchanged

#### Scenario: User tries to exchange a personal or closed task
- **WHEN** the task is personal, completed, or canceled
- **THEN** the action is unavailable and the server rejects any request for that task

### Requirement: Recipient chooses their task when responding
Only the designated recipient SHALL respond. They SHALL choose an open task assigned to them when accepting. A suggested task SHALL be preselected but MAY be changed. Acceptance SHALL atomically record and swap both instances; refusal SHALL preserve both assignments.

#### Scenario: Recipient accepts a suggested task
- **WHEN** the designated recipient accepts a request with an available suggested task
- **THEN** the request records that reciprocal instance and swaps both responsibilities in the same transaction

#### Scenario: Recipient chooses a different task
- **WHEN** the designated recipient replaces the suggestion with a different open residence task assigned to them and accepts
- **THEN** the request records that reciprocal instance and swaps both responsibilities in the same transaction

#### Scenario: Recipient decides when no task was suggested
- **WHEN** the designated recipient chooses an open task assigned to them and accepts a request without a suggestion
- **THEN** the request records both task instances and swaps their responsibilities in the same transaction

#### Scenario: Recipient has no eligible task
- **WHEN** the designated recipient has no open residence task assigned to them
- **THEN** the request can be refused but cannot be accepted as an exchange

#### Scenario: Recipient refuses
- **WHEN** the designated recipient refuses a pending request
- **THEN** the request becomes refused and both task responsibilities remain unchanged

#### Scenario: Another user attempts to respond
- **WHEN** a user other than the designated recipient attempts to accept or refuse
- **THEN** the server rejects the action and the request remains pending

### Requirement: Exchange state transitions are safe
The system SHALL reject repeated responses, invalid transitions, and exchanges on completed, canceled, or already committed task instances. A failed acceptance SHALL leave the request and all task responsibilities unchanged. Private-task details SHALL be disclosed only to the selected recipient and only to support their response; recurring definitions and rotation queues SHALL remain unchanged when one instance is exchanged.

#### Scenario: Request has already reached a final state
- **WHEN** a user attempts to respond to a request that is no longer pending
- **THEN** the server rejects the transition without changing the request or task

#### Scenario: Acceptance persistence fails
- **WHEN** updating the task responsibility fails during acceptance
- **THEN** the transaction rolls back and the request remains pending

### Requirement: Exchange type has explicit scope
The system SHALL expose permanent exchanges only after their effect on recurring definitions and future instances is defined and supported. Until then, the initial flow SHALL support point exchanges only.

#### Scenario: User requests unsupported permanent exchange
- **WHEN** the permanent exchange behavior has not been approved and implemented
- **THEN** the interface does not offer that type and the server rejects a request for it

