# Spec Delta

## Purpose

Permitir que os moradores mantenham um registro compartilhado e atualizado das regras da casa, com autoria identificada, para que os membros compreendam as expectativas aplicáveis à sua residência.

## ADDED Requirements

### Requirement: Membros ativos podem consultar as regras de sua residência

O sistema MUST permitir que todo membro ativo de uma residência consulte suas regras vigentes e MUST NOT expor as regras de uma residência a quem não é membro.

#### Scenario: Membro consulta o mural de regras da residência

- **WHEN** um membro ativo e autenticado solicita as regras de sua residência
- **THEN** o sistema retorna as regras pertencentes àquela residência com título, descrição e data de cadastro de cada regra

#### Scenario: Usuário que não é membro solicita o mural de regras

- **WHEN** um usuário autenticado sem participação ativa solicita as regras de uma residência
- **THEN** o sistema nega o acesso e não retorna o conteúdo de nenhuma regra

#### Scenario: As regras de residências diferentes permanecem isoladas

- **WHEN** um membro solicita o mural de regras de uma residência da qual participa
- **THEN** as regras retornadas não incluem regras pertencentes a outra residência

### Requirement: Membros ativos podem cadastrar regras da residência

O sistema MUST permitir que um membro ativo da residência cadastre uma regra com título e descrição não vazios e MUST registrar a data de cadastro e o membro que a criou.

#### Scenario: Membro cadastra uma regra válida

- **WHEN** um membro ativo envia título e descrição contendo texto que não seja composto apenas por espaços em branco
- **THEN** o sistema armazena a regra na residência desse membro, com data de cadastro gerada pelo servidor e identificação do criador
- **AND** a regra aparece no mural de regras daquela residência

#### Scenario: Membro envia uma regra incompleta

- **WHEN** um membro ativo envia uma regra com título ou descrição vazios
- **THEN** o sistema rejeita a regra e não armazena nenhum registro

### Requirement: Edições de regras preservam a identificação do último editor

O sistema MUST permitir que um membro ativo da residência à qual a regra pertence edite essa regra e MUST identificar no mural o membro que a criou ou editou mais recentemente.

#### Scenario: Membro edita uma regra

- **WHEN** um membro ativo atualiza uma regra de sua residência
- **THEN** o sistema armazena o título e a descrição atualizados
- **AND** o mural de regras identifica esse membro como o editor mais recente

#### Scenario: Usuário de fora da residência tenta editar uma regra

- **WHEN** um usuário sem participação ativa na residência à qual a regra pertence tenta editá-la
- **THEN** o sistema nega a operação e mantém a regra inalterada
