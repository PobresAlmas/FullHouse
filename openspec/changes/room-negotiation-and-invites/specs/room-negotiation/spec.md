# Spec Delta

## Purpose

Lets people seeking a room negotiate privately with its advertiser and receive a separate, explicit invitation before joining the advertiser's house. It keeps interest, conversation, and house membership as distinct decisions.

## ADDED Requirements

### Requirement: An accepted room interest starts a negotiation

The system SHALL treat acceptance of a room interest as permission to begin a negotiation, not as a reservation or house membership. The interested person SHALL be able to review their own interests and their current status.

#### Scenario: Advertiser accepts an interest

- **WHEN** the advertiser accepts a pending interest
- **THEN** the interest becomes `ACEITO`, one private negotiation conversation is created or reused for that interest, and the interested person can find and open it

#### Scenario: Advertiser declines an interest

- **WHEN** the advertiser declines a pending interest
- **THEN** the interest becomes `RECUSADO` and no negotiation conversation is opened for it

#### Scenario: Interested person checks request status

- **WHEN** an authenticated person views their own room interests
- **THEN** the system shows each requested listing and its current status without exposing another person's requests

### Requirement: Negotiation conversation is private and independent of house membership

The system SHALL provide a private conversation between the advertiser and the interested person for an accepted interest, including while the interested person is not a member of the house.

#### Scenario: Participants exchange negotiation messages

- **GIVEN** an accepted interest with an active negotiation conversation
- **WHEN** either participant sends a message
- **THEN** the other participant can read it and reply, and unrelated house members and users cannot access the conversation

#### Scenario: Non-member continues negotiation

- **GIVEN** the interested person has not joined the advertiser's house
- **WHEN** they open their accepted negotiation
- **THEN** they can read and send messages without first becoming a house member

#### Scenario: Invitation is declined

- **GIVEN** an invitation associated with an active negotiation is declined
- **WHEN** either conversation participant reopens the conversation
- **THEN** the conversation and its message history remain available to both participants

#### Scenario: Invitee joins the house

- **GIVEN** the interested person accepts an invitation and becomes a house member
- **WHEN** they reopen the negotiation
- **THEN** the private conversation remains available and does not become visible to other house members

### Requirement: House managers can invite a negotiation participant

The system SHALL let a leader or administrator of the advertised house send an invitation to the interested person from their private negotiation. An invitation SHALL be a separate decision from accepting interest.

#### Scenario: Manager sends invitation

- **GIVEN** an accepted room interest with an active negotiation
- **WHEN** a leader or administrator sends an invitation to its interested person
- **THEN** a pending house invitation is created for that exact user and the user receives an actionable in-app notification

#### Scenario: Non-manager attempts to invite

- **GIVEN** a user without the leader or administrator role
- **WHEN** they attempt to send an invitation
- **THEN** the system rejects the request and creates no invitation

#### Scenario: Invitee accepts invitation

- **GIVEN** the intended invitee has a pending invitation
- **WHEN** they accept it
- **THEN** the invitation becomes `ACEITO` and the invitee is added as an active member of the invited house

#### Scenario: Invitee declines invitation

- **GIVEN** the intended invitee has a pending invitation
- **WHEN** they decline it
- **THEN** the invitation becomes `RECUSADO` and the negotiation conversation remains available

#### Scenario: Another user attempts to answer invitation

- **GIVEN** a pending invitation addressed to a specific user
- **WHEN** a different authenticated user attempts to accept or decline it
- **THEN** the system rejects the request and leaves both invitation and membership unchanged

### Requirement: In-app notifications expose negotiation actions

The system SHALL persist notifications for negotiation events and provide an in-app notification list. The interested person SHALL be notified when an interest is accepted and when an invitation is sent; invitation notifications SHALL allow the intended recipient to accept or decline.

#### Scenario: Interested person is notified of acceptance

- **GIVEN** an advertiser accepts an interest
- **WHEN** the acceptance is committed
- **THEN** a notification for the interested person links to the private negotiation conversation

#### Scenario: Invitee acts from notification

- **GIVEN** the invitee has a notification for a pending house invitation
- **WHEN** they accept or decline using the notification action
- **THEN** the corresponding invitation decision is applied and the notification reflects that it was handled

#### Scenario: User reads notifications

- **GIVEN** a user has persisted notifications
- **WHEN** they open the in-app notification list
- **THEN** they see only their own notifications and can open the related conversation or invitation action
