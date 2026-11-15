# Spec Delta

## Purpose

Help residents coordinate household decisions by scheduling meetings, inviting all current members, collecting attendance responses, and preserving organizer control over schedule changes.

## ADDED Requirements

### Requirement: Active members can schedule residence meetings

The system MUST allow an active residence member to schedule a meeting with a date, time, and non-empty agenda, and MUST invite all active members of that residence.

#### Scenario: Member schedules a meeting

- **WHEN** an active member submits a future date and time and a non-empty agenda for their residence
- **THEN** the system stores the meeting under that residence with the authenticated member as organizer
- **AND** creates a pending invitation for every active member of that residence, including the organizer

#### Scenario: Member submits an invalid meeting

- **WHEN** an active member submits a meeting without a date, time, or agenda, or with a date and time in the past
- **THEN** the system rejects the request and creates no meeting or invitations

#### Scenario: User outside the residence attempts to schedule a meeting

- **WHEN** a user without active participation submits a meeting for that residence
- **THEN** the system denies the request and creates no meeting

### Requirement: Invitees can respond to meeting invitations

The system MUST let an active invited member confirm or decline attendance and MUST show the response status to active members of the residence.

#### Scenario: Invitee confirms attendance

- **WHEN** an active invitee confirms their invitation
- **THEN** the system records the response as confirmed with its response time
- **AND** active members can see the updated response

#### Scenario: Invitee declines attendance

- **WHEN** an active invitee declines their invitation
- **THEN** the system records the response as declined with its response time
- **AND** active members can see the updated response

#### Scenario: Non-invitee or non-member responds

- **WHEN** a user without an active invitation and active residence participation tries to respond
- **THEN** the system denies the operation and leaves all responses unchanged

### Requirement: Meeting organizer can reschedule or cancel a meeting

The system MUST allow only the meeting organizer to reschedule or cancel a scheduled meeting in their residence.

#### Scenario: Organizer reschedules a meeting

- **WHEN** the organizer submits a valid future date and time and agenda for a scheduled meeting
- **THEN** the original meeting is marked as rescheduled and retained in the residence history
- **AND** a replacement meeting is created and linked to the original
- **AND** all active residence members receive a new pending invitation for the replacement meeting

#### Scenario: Organizer cancels a meeting

- **WHEN** the organizer cancels a scheduled meeting
- **THEN** the meeting is marked as canceled and remains visible in the residence history

#### Scenario: Another member attempts to reschedule or cancel

- **WHEN** a member other than the organizer attempts to reschedule or cancel the meeting
- **THEN** the system denies the operation and leaves the meeting unchanged

#### Scenario: User without active residence participation accesses a meeting

- **WHEN** a user without active participation requests or attempts to modify a residence meeting
- **THEN** the system denies access and returns no meeting details
