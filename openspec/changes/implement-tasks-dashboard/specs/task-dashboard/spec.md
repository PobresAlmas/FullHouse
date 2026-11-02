# Task Dashboard Specification

## Purpose

Define the task dashboard contexts, task list filters, and user-visible states.

## ADDED Requirements

### Requirement: Residence-aware task context
The system SHALL associate residence tasks with an active residence accessible to the authenticated user. The interface SHALL display the residence name and members from authorized application data and SHALL NOT use hard-coded residence or member names.

#### Scenario: User opens tasks with an active residence
- **WHEN** the authenticated user opens the task dashboard and has an active residence
- **THEN** the dashboard loads tasks and members for an authorized residence and identifies that residence by its registered name

#### Scenario: User has no active residence
- **WHEN** the user has no active residence available
- **THEN** the dashboard presents an explicit empty state and does not display stale tasks from a prior residence

#### Scenario: Residence request fails
- **WHEN** loading residences or tasks fails
- **THEN** the dashboard presents an error state distinct from an empty result and permits retry

### Requirement: Personal and residence contexts
The system SHALL provide distinct “Pessoal” and residence contexts. The personal context SHALL contain only tasks belonging to or assigned to the authenticated user according to the domain rules. The server SHALL enforce this restriction before returning task data.

#### Scenario: User switches to personal context
- **WHEN** the user selects “Pessoal”
- **THEN** only tasks authorized for that user are displayed and tasks from the previous residence context are cleared while data loads

#### Scenario: Personal task remains visible after changing context
- **WHEN** the user creates a personal task, switches to a residence, then returns to “Pessoal” or reloads the personal list
- **THEN** the saved task is still listed from the authenticated personal-task API

#### Scenario: User changes residence
- **WHEN** the user selects another authorized residence
- **THEN** the task list and member suggestions are replaced with data from the selected residence only

#### Scenario: Previously selected residence is no longer authorized
- **WHEN** access to the selected residence is no longer active
- **THEN** the dashboard discards that residence's data and does not issue or display unauthorized task details

### Requirement: Status filters
The system SHALL provide the filters “Todas”, “Atrasadas”, “Pendentes” and “Concluídas”. “Todas” SHALL include completed tasks. “Atrasadas” SHALL exclude completed and canceled tasks; “Pendentes” SHALL include pending and in-progress tasks; “Concluídas” SHALL include completed tasks. Canceled tasks SHALL NOT appear among active tasks.

#### Scenario: User selects Todas
- **WHEN** the user selects “Todas”
- **THEN** all tasks permitted in the selected context are listed, including completed tasks

#### Scenario: User selects Atrasadas
- **WHEN** the user selects “Atrasadas”
- **THEN** only overdue tasks that are not completed or canceled are listed

#### Scenario: User selects Pendentes
- **WHEN** the user selects “Pendentes”
- **THEN** pending and in-progress tasks are listed

#### Scenario: User selects Concluídas
- **WHEN** the user selects “Concluídas”
- **THEN** completed tasks are listed

### Requirement: Status filter presentation
The four status filters SHALL use the visual treatment shown in `filter.png`, with the labels “Todas”, “Atrasadas”, “Pendentes” and “Concluídas”. The dashboard SHALL NOT add a separate task-kind or visibility filter group such as “Comunitários”, “Privados” or “Meus itens”. Tag/category filters remain distinct from task kind and visibility.

#### Scenario: User sees the status filter group
- **WHEN** the task dashboard is displayed
- **THEN** it presents the four status labels using the reference pill/tab styling and a clear selected state

#### Scenario: Empty filter result
- **WHEN** the selected filter has no matching tasks
- **THEN** the dashboard displays a clear empty state and does not show sample tasks

### Requirement: Readable and accessible task dashboard
The system SHALL follow the supplied task dashboard and filter references, maintain readable typography and contrast, and support keyboard navigation and narrow viewports.

#### Scenario: Dashboard tags and category chips
- **WHEN** task tags and category filters are shown on the dashboard
- **THEN** their chips follow `tasks-screeen.png` with readable contrast, consistent sizing and spacing, and a discernible selected state for category filters

#### Scenario: Single resident label
- **WHEN** exactly one resident is displayed
- **THEN** the label uses singular grammar (“1 morador”)

#### Scenario: Small viewport
- **WHEN** the dashboard is viewed in a narrow viewport
- **THEN** content and filters remain available without overlap or horizontal loss of essential controls

### Requirement: Task header account menu
The avatar in the task dashboard header SHALL be an interactive account-menu button with the same behavior and content as the Home dashboard profile menu: authenticated user's display name, email, and “Sair” action. The menu SHALL be dismissible by clicking outside or pressing Escape and SHALL be keyboard accessible.

#### Scenario: User opens the account menu from Tasks
- **WHEN** the authenticated user activates the avatar in the task dashboard header
- **THEN** the account menu opens with the same account details and sign-out action available from Home

#### Scenario: User dismisses the account menu
- **WHEN** the menu is open and the user presses Escape or clicks outside it
- **THEN** the account menu closes

### Requirement: Task dashboard header and content alignment
The task dashboard SHALL use the shared Home page header and the same “Pessoal” and residence control styling. The content area SHALL begin with the same responsive top and side padding as Home so the two dashboards align below their headers.

#### Scenario: User switches task context
- **WHEN** the task dashboard header is displayed with one or more authorized residences
- **THEN** “Pessoal” and the active residence are presented with the same control layout and selected-state styling as Home

#### Scenario: User has multiple residences
- **WHEN** the authenticated user has multiple authorized residences
- **THEN** the shared context control uses the Home-style residence selector and selecting a residence opens its task context

#### Scenario: Task content begins below the shared header
- **WHEN** the Tasks and Home dashboards are shown at the same viewport width
- **THEN** their content areas use matching responsive top padding below the header

### Requirement: Task page scrollbar presentation
The task dashboard SHALL hide the browser page scrollbar while preserving normal page scrolling. This presentation change SHALL be scoped to the task dashboard and SHALL NOT hide scrollbars on other pages.

#### Scenario: User scrolls the Tasks dashboard
- **WHEN** task content exceeds the viewport height
- **THEN** the page remains scrollable while its browser scrollbar is visually hidden

#### Scenario: User navigates away from Tasks
- **WHEN** the user leaves the task dashboard
- **THEN** other pages retain their normal browser scrollbar behavior

