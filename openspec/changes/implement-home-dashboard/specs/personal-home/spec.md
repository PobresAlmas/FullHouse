# Spec Delta — Home pessoal

## Purpose

Definir a visualização individual da página inicial, preservando a privacidade do usuário e permitindo alternar entre o painel pessoal e o da residência selecionada.

## ADDED Requirements

### Requirement: Acesso à Home pessoal
O sistema SHALL permitir que o usuário autenticado com residência ativa visualize o modo `Pessoal` da Home e retorne ao contexto da residência.

#### Scenario: Abertura do modo pessoal
- **WHEN** o usuário seleciona `Pessoal` no seletor de contexto
- **THEN** o sistema destaca esse modo e apresenta os blocos previstos no protótipo `Home - Pessoal.png`

#### Scenario: Retorno ao contexto da residência
- **WHEN** o usuário seleciona o nome da residência no seletor
- **THEN** a Home volta a exibir os dados da residência selecionada
- **AND** o nome do seletor corresponde ao nome realmente cadastrado

### Requirement: Privacidade dos dados pessoais
O sistema SHALL mostrar no modo pessoal apenas informações pertencentes ao usuário autenticado ou que ele esteja autorizado a consultar em caráter individual.

#### Scenario: Tarefas pessoais
- **WHEN** existem tarefas associadas ao usuário no contexto pessoal
- **THEN** a Home exibe apenas as tarefas pertinentes a ele e suas respectivas contagens

#### Scenario: Contas pessoais
- **WHEN** existem despesas de responsabilidade pessoal do usuário
- **THEN** a seção `Contas próximas` exibe somente essas despesas, de acordo com as regras de acesso do módulo financeiro

#### Scenario: Informação de outros moradores
- **WHEN** uma tarefa ou despesa pertence exclusivamente a outro morador e não é visível ao usuário
- **THEN** o painel pessoal não exibe essa informação nem a inclui em indicadores individuais

### Requirement: Tarefas atrasadas e de hoje no modo pessoal
O sistema SHALL apresentar avisos de tarefas atrasadas e a lista de tarefas do dia atribuídas ao usuário, com contagens coerentes com os dados reais.

#### Scenario: Tarefa pessoal atrasada
- **WHEN** existe tarefa pessoal atrasada visível ao usuário
- **THEN** o painel apresenta o aviso de atraso e o item correspondente

#### Scenario: Tarefas do dia
- **WHEN** existem tarefas pessoais previstas para hoje
- **THEN** a lista `Tarefas de hoje` apresenta as tarefas e a opção `Ver tarefas` permite acessar sua gestão

#### Scenario: Nenhuma tarefa pessoal
- **WHEN** o usuário não possui tarefas pessoais nas categorias exibidas
- **THEN** as seções apresentam estados vazios adequados sem valores demonstrativos

### Requirement: Contas próximas no modo pessoal
O sistema SHALL apresentar somente contas pertinentes ao usuário autenticado e oferecer navegação para o módulo financeiro existente.

#### Scenario: Conta pessoal com vencimento próximo
- **WHEN** o usuário possui despesa pessoal com vencimento próximo
- **THEN** o painel apresenta descrição, valor e prazo conforme dados persistidos
- **AND** a opção `Ver detalhes` direciona ao Financeiro

#### Scenario: Ausência de contas pessoais
- **WHEN** não existem contas pessoais próximas
- **THEN** a seção apresenta estado vazio, sem exibir despesas de terceiros

### Requirement: Resumo semanal pessoal
O sistema SHALL apresentar o bloco `Resumo da semana` com indicadores calculados a partir de informações pessoais autorizadas, sem misturá-las às métricas da residência.

#### Scenario: Existem atividades pessoais na semana
- **WHEN** existem tarefas, despesas ou avisos pessoais contabilizáveis
- **THEN** o painel apresenta os indicadores correspondentes ao usuário e o progresso de tarefas consistente com o período utilizado

#### Scenario: Semana sem dados pessoais
- **WHEN** não existem atividades pessoais contabilizáveis
- **THEN** o painel apresenta indicadores zerados ou estado vazio e não fabrica progresso

### Requirement: Identificação do modo pessoal
O sistema SHALL reproduzir o cartão informativo `Modo pessoal` do protótipo, deixando claro que a visualização destaca informações individuais e não um resumo compartilhado da residência.

#### Scenario: Modo pessoal selecionado
- **WHEN** o usuário visualiza a Home pessoal
- **THEN** o cartão `Modo pessoal` é exibido no posicionamento correspondente ao protótipo
- **AND** o painel não apresenta o bloco de membros da residência como se fosse informação pessoal

### Requirement: Fidelidade visual e tratamento de estados
O sistema SHALL reproduzir a estrutura visual e os cartões de `Home - Pessoal.png`, com estados de carregamento, vazio e erro e adaptação para telas menores.

#### Scenario: Visualização em desktop
- **WHEN** o modo pessoal é exibido em desktop
- **THEN** o seletor, os cartões, as indicações de prioridade e a organização das colunas correspondem ao protótipo

#### Scenario: Falha parcial
- **WHEN** uma consulta de dados pessoais falha
- **THEN** o painel indica o problema no bloco afetado sem expor dados de outra pessoa

#### Scenario: Tela estreita
- **WHEN** a interface é acessada em tela estreita
- **THEN** o conteúdo permanece legível e a troca de contexto continua acessível
