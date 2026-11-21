# Delta specification — house-settings

## ADDED Requirements

### Requirement: Acessar configurações da residência

O sistema SHALL oferecer uma rota protegida `/settings` vinculada à residência ativa, com menu interno `Minha conta`, `Casa`, `Moradores`, `Permissões`, `Notificações`, `Preferências`, visualmente fiel às capturas de referência.

Cada usuário SHALL possuir no máximo uma participação ativa em qualquer residência. O servidor e o banco de dados SHALL rejeitar ativações adicionais, mantendo participações históricas encerradas.

#### Scenario: Morador autenticado acessa a área
- **WHEN** um usuário autenticado com residência ativa abre `/settings`
- **THEN** o sistema exibe a navegação interna e a seção Casa, sem dados fictícios

#### Scenario: Usuário sem residência
- **WHEN** um usuário sem residência abre `/settings`
- **THEN** o sistema exibe um estado vazio com saída adequada, sem requisições com `residenceId` indefinido

#### Scenario: Conta pessoal
- **WHEN** o usuário seleciona `Minha conta`
- **THEN** ele é encaminhado ao formulário já existente em `/profile`, sem cópia de lógica

#### Scenario: Acesso não autorizado
- **WHEN** um usuário não autenticado tenta abrir `/settings`
- **THEN** a proteção de rotas existente impede o acesso

#### Scenario: Participação ativa em uma única residência
- **GIVEN** o usuário já possui participação ativa em uma residência
- **WHEN** tenta criar outra residência ou aceitar convite para outra casa
- **THEN** o servidor rejeita a operação sem criar uma segunda participação ativa

### Requirement: Persistir seção ativa na URL

O sistema SHALL representar seção e aba selecionadas por query params estáveis, com navegação acessível e fallback definido.

#### Scenario: Recarregar aba
- **WHEN** a URL `/settings?section=preferences&tab=pantry` é recarregada
- **THEN** a aba Despensa reaparece selecionada

#### Scenario: Query inválida
- **WHEN** a URL contém uma seção ou aba não reconhecida
- **THEN** o sistema normaliza para uma seção e aba válidas sem travar

### Requirement: Consultar e atualizar informações da casa

O sistema SHALL mostrar o nome e os dados disponíveis da residência autenticada e permitir alterar o nome somente com autorização do servidor.

#### Scenario: Editar nome autorizado
- **GIVEN** um usuário com papel `LIDER` ou `ADMINISTRADOR`
- **WHEN** ele informa nome não vazio de até 80 caracteres e salva
- **THEN** o nome é persistido, exibido na seção Casa e refletido na navegação global

#### Scenario: Nome inválido
- **WHEN** o usuário tenta salvar nome vazio ou acima do limite
- **THEN** o backend retorna erro de validação e não altera o registro

#### Scenario: Morador não gerente
- **WHEN** um morador sem papel de gestão tenta alterar o nome pelo endpoint
- **THEN** o servidor rejeita a operação; o botão não aparece habilitado na interface

### Requirement: Exibir moradores sem vazar dados

O sistema SHALL listar apenas membros da residência ativa, sem campos sensíveis, indicando nome, identificador público de contato quando autorizado e papel.

#### Scenario: Abrir Moradores
- **WHEN** um membro ativo abre a seção Moradores
- **THEN** vê somente membros ativos da residência selecionada, com tratamento de lista vazia

#### Scenario: Consultar outra residência
- **WHEN** o usuário tenta consultar a lista de residência da qual não faz parte
- **THEN** recebe 404 ou resposta de acesso negado sem dados de moradores

### Requirement: Gerenciar política de permissões existente

O sistema SHALL consumir `GET/PATCH /residences/:id/settings/permissions` e apresentar as opções reais `TODOS` e `LIDERES`, sem confundi-las com permissões individuais do protótipo.

#### Scenario: Alteração por gestor
- **GIVEN** líder ou administrador
- **WHEN** ele altera a política global e salva
- **THEN** a API persiste a configuração, a tela apresenta confirmação e o novo valor permanece após atualização da página

#### Scenario: Tentativa de alteração por morador
- **GIVEN** um morador que não é líder nem administrador
- **WHEN** ele consulta a política ou tenta alterá-la diretamente pela API
- **THEN** pode consultar, mas a alteração é recusada pelo backend

### Requirement: Níveis individuais do protótipo usam autorização real

O sistema SHALL distinguir `Administrador`, `Pode editar` e `Somente leitura` por membro. Um override nulo herda a política global; papéis de gestão permanecem separados da permissão de conteúdo. Somente líderes e administradores podem alterar o acesso.

#### Scenario: Administrador na lista
- **WHEN** o usuário listado é `LIDER` ou `ADMINISTRADOR`
- **THEN** a interface indica seu papel de gestão e não simula um botão de rebaixamento

#### Scenario: Permissão de edição específica
- **GIVEN** o backend suporta override por morador e autoriza a mudança
- **WHEN** o gestor revoga a edição de um morador
- **THEN** a interface reflete `Somente leitura` e as APIs de criação/edição negam chamadas feitas por ele

#### Scenario: Remover morador
- **GIVEN** um administrador visualizando a tabela de moradores
- **WHEN** abre o menu de três pontos e remove um membro elegível
- **THEN** a participação é encerrada, o histórico permanece e o líder ou o próprio administrador não pode ser removido por essa ação

### Requirement: Coerência do layout com as referências

O sistema SHALL reutilizar `AppSidebar`, `AppPageHeader` e componentes do design system, preservando fundo claro/lilás, hierarquia de cartões, indicação de seleção e responsividade do protótipo.

#### Scenario: Mobile
- **WHEN** o usuário abre configurações em tela estreita
- **THEN** consegue navegar entre seções e abas sem corte horizontal nem sobreposição

#### Scenario: Notificações atuais
- **WHEN** o usuário abre Notificações
- **THEN** vê os avisos já persistidos para sua própria conta, pode alternar entre visão geral e não lidas, marcar avisos como lidos e carregar páginas seguintes
- **AND** a tela atualiza periodicamente pela API autenticada sem afirmar que eventos não implementados serão gerados

#### Scenario: Teste de regressão visual
- **WHEN** as nove páginas são comparadas com as imagens originais
- **THEN** as diferenças intencionais são documentadas e os padrões fundamentais de layout/cores são preservados
