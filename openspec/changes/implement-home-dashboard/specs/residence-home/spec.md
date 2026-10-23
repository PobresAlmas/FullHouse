# Spec Delta — Home da residência

## Purpose

Definir o painel inicial contextualizado pela residência selecionada, com informações reais da casa, acesso a tarefas e finanças e identificação dinâmica do nome da residência.

## ADDED Requirements

### Requirement: Seleção e identificação da residência
O sistema SHALL apresentar a Home da residência ativa usando dados da residência acessível ao usuário, incluindo seu nome cadastrado, sem nomes de exemplo fixos.

#### Scenario: Residência ativa
- **WHEN** o usuário acessa a Home no contexto de uma residência válida
- **THEN** o seletor de contexto identifica a residência pelo nome persistido no sistema
- **AND** os dados exibidos pertencem a essa residência

#### Scenario: Mudança de residência selecionada
- **WHEN** o usuário seleciona outra residência à qual possui acesso, caso haja mais de uma
- **THEN** o painel apresenta os dados da nova residência e atualiza o nome exibido
- **AND** não mistura dados das duas residências

#### Scenario: Residência sem acesso ou vínculo encerrado
- **WHEN** a residência selecionada deixa de estar acessível ao usuário
- **THEN** o sistema não exibe informações privadas dessa residência
- **AND** apresenta um contexto permitido ou o estado de ausência de residência, conforme os vínculos disponíveis

### Requirement: Alternância entre modos da Home
O sistema SHALL disponibilizar a alternância visível entre o contexto `Pessoal` e o contexto identificado pelo nome da residência selecionada.

#### Scenario: Alternar para modo pessoal
- **WHEN** o usuário ativa a opção `Pessoal` na Home da residência
- **THEN** o sistema apresenta a Home pessoal e destaca `Pessoal` no seletor

#### Scenario: Retornar à residência
- **WHEN** o usuário ativa a opção da residência a partir da Home pessoal
- **THEN** o sistema apresenta a Home da residência selecionada e destaca seu nome no seletor

### Requirement: Painel de tarefas da residência
O sistema SHALL exibir tarefas atrasadas e tarefas previstas para o dia da residência selecionada, respeitando as regras de visibilidade e os dados persistidos.

#### Scenario: Existem tarefas atrasadas
- **WHEN** há tarefas atrasadas visíveis ao usuário na residência
- **THEN** o painel exibe aviso de atraso com contagem consistente e informações das tarefas apresentadas

#### Scenario: Existem tarefas para hoje
- **WHEN** há tarefas com vencimento no dia corrente no contexto da residência
- **THEN** a seção `Tarefas de hoje` exibe quantidade e itens correspondentes
- **AND** a opção `Ver tarefas` leva à funcionalidade de tarefas existente

#### Scenario: Ausência de tarefas
- **WHEN** não existem tarefas em uma seção
- **THEN** a seção apresenta um estado vazio adequado, sem inventar tarefas ou quantidades

### Requirement: Contas próximas da residência
O sistema SHALL exibir contas futuras ou pendentes pertinentes à residência selecionada, utilizando informações disponíveis do módulo financeiro e respeitando suas regras de acesso.

#### Scenario: Existe conta próxima
- **WHEN** uma conta acessível à residência possui vencimento próximo
- **THEN** o painel mostra identificação, valor e prazo coerentes com os dados persistidos
- **AND** a ação `Ver detalhes` direciona o usuário à funcionalidade financeira correspondente

#### Scenario: Não existem contas próximas
- **WHEN** nenhuma conta satisfaz os critérios definidos para `Contas próximas`
- **THEN** a seção apresenta estado vazio sem valores fictícios

### Requirement: Avisos da residência
O sistema SHALL disponibilizar o bloco visual `Aviso da casa` e apresentar apenas avisos reais e autorizados, ou um estado vazio quando não existir fonte de dados para avisos.

#### Scenario: Há avisos disponíveis
- **WHEN** existem avisos da residência acessíveis ao usuário
- **THEN** o painel apresenta suas informações conforme o protótipo

#### Scenario: Não há avisos ou funcionalidade correspondente
- **WHEN** não existem avisos persistidos ou a funcionalidade ainda não possui origem de dados
- **THEN** o sistema mostra estado vazio ou indisponível de forma clara
- **AND** não apresenta o aviso de exemplo do protótipo como conteúdo real

### Requirement: Resumo semanal da residência
O sistema SHALL apresentar o bloco `Resumo da semana` com indicadores derivados de dados reais e com um critério consistente para o período semanal e para o progresso de tarefas.

#### Scenario: Há atividades na semana
- **WHEN** existem tarefas, contas e avisos contabilizáveis na semana definida
- **THEN** o painel apresenta as contagens correspondentes e a proporção de progresso das tarefas

#### Scenario: Semana sem dados
- **WHEN** não existem dados contabilizáveis na semana
- **THEN** os indicadores apresentam zero ou estado vazio apropriado
- **AND** o progresso não é calculado por divisão por zero nem exibido com valor inventado

### Requirement: Membros da residência
O sistema SHALL exibir os integrantes ativos da residência, com nomes e papéis derivados de dados autorizados, no bloco `Membros da casa`.

#### Scenario: Membros encontrados
- **WHEN** a residência possui membros ativos visíveis ao usuário
- **THEN** o painel apresenta os membros e seus papéis conforme os dados cadastrados

#### Scenario: Carregamento ou erro de membros
- **WHEN** a consulta de membros falha ou ainda está carregando
- **THEN** o painel informa o estado correspondente sem exibir dados de outra residência

### Requirement: Fidelidade visual e estados de dados
O sistema SHALL reproduzir a composição, a hierarquia de cartões, o cabeçalho, a navegação lateral e os estados visuais do protótipo `Home - Casa.png`, sem substituir dados reais por conteúdo demonstrativo.

#### Scenario: Desktop com dados disponíveis
- **WHEN** a Home da residência é exibida em desktop
- **THEN** o painel utiliza a organização em colunas, cartões e sinalizações visuais compatíveis com o protótipo

#### Scenario: Falha parcial de carregamento
- **WHEN** apenas uma das consultas do painel falha
- **THEN** o sistema identifica o bloco com erro e mantém utilizáveis os demais blocos carregados

#### Scenario: Largura reduzida
- **WHEN** o painel é acessado em uma tela estreita
- **THEN** os cartões reorganizam sua disposição sem ocultar informações essenciais ou impedir a navegação
