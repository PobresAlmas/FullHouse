# Task Assignment and Privacy Specification

## Purpose

Define task creation, assignment, tag entry, and private-task authorization.

## ADDED Requirements

### Requirement: Every task has a responsible owner
The system SHALL require a responsible owner for every task in every context and under every residence policy. The server SHALL reject missing or null responsibility, and the interface SHALL NOT offer an unassigned option. Personal tasks SHALL be assigned to the authenticated user. Residence policy governs whether the creator may choose other active residents or a valid non-empty rotation.

#### Scenario: Authorized user assigns an active resident
- **WHEN** a user permitted by the residence policy creates a residence task for an active resident of that same residence
- **THEN** the task is created with that valid resident assignment

#### Scenario: User without third-party assignment permission
- **WHEN** a user without permission attempts to assign a residence task to another resident or use a rotation
- **THEN** the server rejects the request and the interface assigns the task to the current user only

#### Scenario: Any user omits the responsible owner
- **WHEN** any user, including a user authorized to assign other residents, creates a task without a responsible owner
- **THEN** the interface requires a valid selection and the server rejects the request without creating the task

#### Scenario: Authorized user submits an empty rotation
- **WHEN** a user permitted to assign tasks submits a rotation with no active members
- **THEN** the server rejects the request without creating an unassigned task

#### Scenario: Personal task creation
- **WHEN** a user creates a task in the personal context
- **THEN** the task belongs to the authenticated user and cannot be assigned to another resident or left without an owner

#### Scenario: Assignment references inactive or foreign resident
- **WHEN** a task request references a member who is inactive or belongs to a different residence
- **THEN** the server rejects the request without creating or changing the task

### Requirement: Private tasks are isolated
The system SHALL enforce private task visibility on the server for task lists, detail reads, updates, and task exchanges. A private residence task SHALL be visible only to its fixed responsible member; an individual task SHALL be visible only to its owning authenticated user.

#### Scenario: Authorized user reads a private task
- **WHEN** the responsible member or individual-task owner requests a private task
- **THEN** the server returns only fields needed by the task interface

#### Scenario: Other resident requests a private task
- **WHEN** a resident without authorization lists tasks or requests the private task by identifier
- **THEN** the task is not disclosed

#### Scenario: Unauthorized update or exchange
- **WHEN** a user without private-task access attempts to edit or exchange the task
- **THEN** the server rejects the operation and leaves the task unchanged

### Requirement: Tags and task presentation are usable
The system SHALL allow a user to add a typed tag as a visible chip and choose from existing authorized tags. Selected tags SHALL have a discernible selected state. Task-tag chips and category-filter chips on the dashboard SHALL follow the supplied dashboard reference with readable contrast, consistent sizing and spacing. Task category colors, times, and reminders SHALL remain readable with sufficient contrast. Category filters are not task-kind or visibility filters.

#### Scenario: User adds a new tag
- **WHEN** the user enters a tag and activates the add action
- **THEN** the tag appears as a selected chip and is included in the saved task

#### Scenario: User selects an existing tag suggestion
- **WHEN** the user selects a tag already used in the authorized context
- **THEN** the tag is visibly selected and included once in the task

#### Scenario: User reviews time and reminder
- **WHEN** task time and reminder are displayed or edited
- **THEN** their text, controls, and reminder icon remain legible and follow the supplied `new-task.png` reference

