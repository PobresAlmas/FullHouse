# Spec Delta — Home sem residência

## Purpose

Definir a experiência inicial do usuário autenticado sem residência ativa e permitir que ele crie sua primeira residência com associação e permissões adequadas.

## ADDED Requirements

### Requirement: Exibição da Home sem residência
O sistema SHALL apresentar a experiência inicial de criação de residência ao usuário autenticado que não possua vínculo ativo com nenhuma residência.

#### Scenario: Primeiro acesso sem residência
- **WHEN** o usuário autenticado acessa a rota inicial e não possui residência ativa
- **THEN** o sistema apresenta a saudação personalizada e o formulário de criação de casa, conforme o protótipo `Home - Não Alocado.png`
- **AND** não exibe dados de painel de uma residência inexistente

#### Scenario: Distinção entre ausência de residência e falha de carregamento
- **WHEN** a consulta às residências ainda está em andamento
- **THEN** o sistema apresenta um estado de carregamento apropriado
- **AND** não conclui prematuramente que o usuário não possui residência

#### Scenario: Falha na consulta de residências
- **WHEN** a consulta às residências falha
- **THEN** o sistema apresenta mensagem de erro e uma forma de tentar novamente
- **AND** não apresenta o formulário como se a ausência de residências tivesse sido confirmada

### Requirement: Formulário de criação de residência
O sistema SHALL permitir ao usuário autenticado informar o nome da nova residência e solicitar sua criação, impedindo envios inválidos ou duplicados durante a operação.

#### Scenario: Nome válido
- **WHEN** o usuário informa um nome não vazio e aciona `Criar casa`
- **THEN** o sistema envia a solicitação autenticada de criação da residência
- **AND** indica o estado de processamento até obter resposta

#### Scenario: Nome inválido
- **WHEN** o usuário tenta criar uma residência com nome vazio ou composto apenas de espaços
- **THEN** o sistema impede a criação e informa a necessidade de preencher o nome

#### Scenario: Requisição de criação em andamento
- **WHEN** uma solicitação de criação está em andamento
- **THEN** o sistema impede novos envios simultâneos pelo mesmo formulário

#### Scenario: Falha na criação
- **WHEN** o servidor rejeita a criação ou ocorre falha na comunicação
- **THEN** o sistema informa que a casa não foi criada
- **AND** preserva o nome informado para que o usuário possa corrigir ou tentar novamente

### Requirement: Associação inicial do criador
O sistema SHALL criar a residência e associar o usuário autenticado como seu responsável com o papel administrativo inicial previsto no modelo de permissões, em uma operação consistente.

#### Scenario: Criação bem-sucedida
- **WHEN** a criação da residência é confirmada
- **THEN** a residência passa a constar entre as residências do usuário
- **AND** o criador recebe o papel inicial de liderança ou administração definido pelo domínio
- **AND** a Home passa a oferecer a visualização dessa residência usando seu nome cadastrado

#### Scenario: Falha ao registrar o vínculo inicial
- **WHEN** a associação do criador falha durante a criação
- **THEN** o sistema não confirma a criação de uma residência inacessível ao próprio criador

### Requirement: Navegação simplificada sem residência
O sistema SHALL reproduzir o cabeçalho e a navegação lateral reduzida do estado sem residência, preservando ações existentes de perfil e conta.

#### Scenario: Home selecionada
- **WHEN** o usuário sem residência visualiza a Home
- **THEN** a navegação apresenta `Home` como seção ativa e exibe a opção `Perfil`
- **AND** não oferece seções dependentes de uma residência inexistente

#### Scenario: Perfil selecionado
- **WHEN** o usuário acessa a opção `Perfil`
- **THEN** a navegação destaca `Perfil` conforme a referência `Home - Não Alocado-1.png`
- **AND** utiliza o comportamento de perfil efetivamente disponível na aplicação, sem duplicar uma tela inexistente

### Requirement: Fidelidade visual da experiência inicial
O sistema SHALL reproduzir a hierarquia visual, a disposição e os elementos da Home sem residência dos protótipos, adaptando-os para diferentes larguras de tela sem inviabilizar as interações.

#### Scenario: Exibição em desktop
- **WHEN** a Home sem residência é visualizada na largura de referência do protótipo
- **THEN** cabeçalho, menu lateral, cartão de criação, rótulos, botão, cores e espaçamentos seguem os protótipos fornecidos

#### Scenario: Exibição em tela estreita
- **WHEN** a janela possui largura reduzida
- **THEN** o formulário e a navegação permanecem legíveis, acessíveis e operáveis sem rolagem horizontal desnecessária
