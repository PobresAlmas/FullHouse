# Spec Delta

## Purpose

Disponibilizar um chat da residência para que os moradores ativos troquem mensagens sobre a casa na aplicação e recebam novas mensagens enquanto estiverem conectados à conversa.

## ADDED Requirements

### Requirement: O acesso ao chat é restrito aos membros ativos da residência

O sistema MUST permitir que somente usuários com participação ativa em uma residência obtenham a conversa e as mensagens daquela residência ou se conectem ao seu fluxo de mensagens em tempo real.

#### Scenario: Membro ativo abre a conversa da residência

- **WHEN** um membro ativo e autenticado solicita a conversa de uma residência
- **THEN** o sistema retorna a conversa e seu histórico de mensagens daquela residência

#### Scenario: Usuário sem participação ativa solicita dados do chat

- **WHEN** um usuário autenticado sem participação ativa solicita a conversa, suas mensagens ou seu fluxo em tempo real
- **THEN** o sistema nega o acesso e não retorna o conteúdo da conversa

#### Scenario: O acesso termina enquanto um fluxo em tempo real está conectado

- **WHEN** a participação ativa de um membro termina enquanto seu fluxo em tempo real está aberto
- **THEN** o sistema encerra o fluxo e não envia mensagens posteriores àquele usuário

### Requirement: Membros podem enviar e ler mensagens com autoria identificada

O sistema MUST permitir que um membro ativo da residência envie uma mensagem não vazia e MUST mostrar o autor e a data e o horário de envio de cada mensagem aos membros autorizados.

#### Scenario: Membro envia uma mensagem

- **WHEN** um membro ativo envia à conversa de sua residência uma mensagem contendo texto que não seja composto apenas por espaços em branco
- **THEN** o sistema armazena a mensagem com o membro autenticado como autor e com data e horário de envio gerados pelo servidor
- **AND** a mensagem aparece no histórico da conversa com esse autor, data e horário

#### Scenario: Membro envia uma mensagem vazia

- **WHEN** um membro ativo envia uma mensagem composta apenas por espaços em branco
- **THEN** o sistema rejeita a mensagem sem armazená-la

#### Scenario: Membro consulta o histórico da conversa

- **WHEN** um membro ativo solicita as mensagens da conversa de sua residência
- **THEN** o sistema retorna as mensagens em ordem cronológica, com autor, data e horário

### Requirement: Membros conectados recebem novas mensagens sem recarregar a página

O sistema MUST entregar uma nova mensagem persistida aos demais membros ativos conectados à mesma conversa da residência, sem exigir o recarregamento da página.

#### Scenario: Uma nova mensagem chega enquanto os membros estão conectados

- **WHEN** um membro ativo envia uma mensagem enquanto outro membro ativo está conectado à mesma conversa
- **THEN** o remetente recebe a mensagem persistida na resposta normal do envio
- **AND** o outro membro conectado recebe essa mensagem pelo canal em tempo real, sem recarregar a página

#### Scenario: A mensagem pertence a outra residência

- **WHEN** uma mensagem é enviada na conversa de uma residência
- **THEN** os membros conectados a outras residências não a recebem
