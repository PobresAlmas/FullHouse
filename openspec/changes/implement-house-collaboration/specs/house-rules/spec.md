# Spec Delta

## Purpose

Let residents keep a shared, current record of household rules with clear authorship so members can understand the expectations that apply in their residence.

## ADDED Requirements

### Requirement: Active members can consult their residence rules

The system MUST allow every active member of a residence to consult its current rules and MUST NOT expose rules from a residence to non-members.

#### Scenario: Member views the residence rule board

- **WHEN** an authenticated active member requests the rules for their residence
- **THEN** the system returns the rules belonging to that residence with each rule's title, description, and registration date

#### Scenario: Non-member requests the rule board

- **WHEN** an authenticated user without active participation requests rules for a residence
- **THEN** the system denies access and returns no rule content

#### Scenario: Rules from separate residences are isolated

- **WHEN** a member requests the rule board for a residence they belong to
- **THEN** the returned rules contain no rules belonging to another residence

### Requirement: Active members can register residence rules

The system MUST allow an active residence member to register a rule with a non-empty title and description and MUST record the registration date and the member who created it.

#### Scenario: Member registers a valid rule

- **WHEN** an active member submits a title and description containing non-whitespace text
- **THEN** the system stores the rule under that member's residence with a server-generated registration date and creator attribution
- **AND** the rule appears on that residence's rule board

#### Scenario: Member submits an incomplete rule

- **WHEN** an active member submits a rule with an empty title or description
- **THEN** the system rejects the rule and stores no record

### Requirement: Rule edits preserve last-editor attribution

The system MUST allow an active member of the rule's residence to edit a rule and MUST identify the member who most recently created or edited it on the rule board.

#### Scenario: Member edits a rule

- **WHEN** an active member updates a rule in their residence
- **THEN** the system stores the updated title and description
- **AND** the rule board identifies that member as the most recent editor

#### Scenario: User outside the residence attempts to edit a rule

- **WHEN** a user without active participation in the rule's residence attempts to edit it
- **THEN** the system denies the operation and leaves the rule unchanged
