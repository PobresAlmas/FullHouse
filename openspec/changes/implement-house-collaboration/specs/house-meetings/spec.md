# Spec Delta

## Purpose

Ajudar os moradores a coordenar decisões da casa por meio do agendamento de reuniões, do convite a todos os membros atuais, do registro de respostas de presença e da manutenção do controle do organizador sobre alterações no agendamento.

## ADDED Requirements

### Requirement: Membros ativos podem agendar reuniões da residência

O sistema MUST permitir que um membro ativo da residência agende uma reunião com data, horário e pauta não vazia e MUST convidar todos os membros ativos daquela residência.

#### Scenario: Membro agenda uma reunião

- **WHEN** um membro ativo informa data e horário futuros e uma pauta não vazia para sua residência
- **THEN** o sistema armazena a reunião naquela residência com o membro autenticado como organizador
- **AND** cria um convite pendente para cada membro ativo daquela residência, incluindo o organizador

#### Scenario: Membro envia uma reunião inválida

- **WHEN** um membro ativo envia uma reunião sem data, horário ou pauta, ou com data e horário no passado
- **THEN** o sistema rejeita a solicitação e não cria reunião nem convites

#### Scenario: Usuário de fora da residência tenta agendar uma reunião

- **WHEN** um usuário sem participação ativa envia uma reunião para aquela residência
- **THEN** o sistema nega a solicitação e não cria a reunião

### Requirement: Convidados podem responder aos convites de reunião

O sistema MUST permitir que um membro ativo convidado confirme ou recuse a presença e MUST mostrar a situação da resposta aos membros ativos da residência.

#### Scenario: Convidado confirma presença

- **WHEN** um convidado ativo confirma seu convite
- **THEN** o sistema registra a resposta como confirmada, com o horário da resposta
- **AND** os membros ativos podem consultar a resposta atualizada

#### Scenario: Convidado recusa presença

- **WHEN** um convidado ativo recusa seu convite
- **THEN** o sistema registra a resposta como recusada, com o horário da resposta
- **AND** os membros ativos podem consultar a resposta atualizada

#### Scenario: Usuário sem convite ou sem participação responde

- **WHEN** um usuário que não possui simultaneamente convite ativo e participação ativa na residência tenta responder
- **THEN** o sistema nega a operação e mantém todas as respostas inalteradas

### Requirement: O organizador pode reagendar ou cancelar uma reunião

O sistema MUST permitir que somente o organizador da reunião reagende ou cancele uma reunião agendada em sua residência.

#### Scenario: Organizador reagenda uma reunião

- **WHEN** o organizador informa data e horário futuros válidos e uma pauta para uma reunião agendada
- **THEN** a reunião original é marcada como reagendada e mantida no histórico da residência
- **AND** uma reunião substituta é criada e vinculada à original
- **AND** todos os membros ativos da residência recebem um novo convite pendente para a reunião substituta

#### Scenario: Organizador cancela uma reunião

- **WHEN** o organizador cancela uma reunião agendada
- **THEN** a reunião é marcada como cancelada e permanece visível no histórico da residência

#### Scenario: Outro membro tenta reagendar ou cancelar

- **WHEN** um membro diferente do organizador tenta reagendar ou cancelar a reunião
- **THEN** o sistema nega a operação e mantém a reunião inalterada

#### Scenario: Usuário sem participação ativa na residência acessa uma reunião

- **WHEN** um usuário sem participação ativa solicita ou tenta modificar uma reunião da residência
- **THEN** o sistema nega o acesso e não retorna os detalhes da reunião
