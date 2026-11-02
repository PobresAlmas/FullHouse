# Spec Delta — Gerenciamento de categorias da despensa

## Purpose

Definir categorias persistidas por residência e sua associação aos itens da despensa, preservando os rótulos legados.

## ADDED Requirements

### Requirement: Isolamento e autorização por residência

O sistema SHALL limitar a consulta de categorias a membros ativos da residência proprietária e autorizar gestão conforme política central existente para a despensa. Se não existir política explícita, qualquer membro ativo pode criar, renomear ou remover categoria sem itens associados.

#### Scenario: Membro ativo consulta categorias

- **WHEN** um membro ativo consulta as categorias de sua residência
- **THEN** o sistema retorna somente categorias cadastradas para aquela residência

#### Scenario: Usuário sem vínculo ativo

- **WHEN** um usuário sem vínculo ativo consulta ou altera categorias da residência
- **THEN** o sistema nega a operação sem revelar dados de outra residência

#### Scenario: Reutilizar política central

- **WHEN** existe política central explícita para gestão compartilhada da despensa
- **THEN** a API de categorias aplica a mesma política sem criar papéis paralelos

#### Scenario: Sem política central explícita

- **WHEN** não existe política central para gestão de categorias
- **THEN** qualquer membro ativo pode criar e renomear categorias
- **AND** pode remover categorias sem itens associados

### Requirement: Categorias iniciais por residência

O sistema SHALL manter registros das categorias iniciais Bebidas, Doces, Grãos, Higiene, Laticínios, Limpeza, Massas e Outros para cada residência.

#### Scenario: Inicializar residência nova

- **WHEN** uma residência é criada
- **THEN** as categorias iniciais são provisionadas sem duplicatas
- **AND** falha no provisionamento não deixa a residência parcialmente inicializada

#### Scenario: Preparar residência existente

- **WHEN** o backfill prepara uma residência existente
- **THEN** categorias iniciais ainda ausentes são criadas
- **AND** equivalentes não são duplicados
- **AND** categorias customizadas legadas são preservadas

#### Scenario: Renomear ou remover categoria inicial

- **WHEN** uma categoria inicial não tem item associado
- **THEN** um membro autorizado pode renomeá-la ou removê-la
- **AND** uma categoria removida não volta a aparecer automaticamente

### Requirement: Criar e renomear categorias

O sistema SHALL validar nomes e manter nomes únicos por residência após normalização.

#### Scenario: Criar categoria válida

- **WHEN** membro autorizado cria nome de 1 a 80 caracteres após normalização de espaços sem equivalente na residência
- **THEN** a categoria é vinculada à residência
- **AND** o rótulo preserva acentos e capitalização informados

#### Scenario: Nome vazio ou longo

- **WHEN** o nome está vazio após trim ou excede 80 caracteres após normalizar espaços
- **THEN** a operação é rejeitada com “Informe o nome da categoria.” ou “O nome da categoria deve ter no máximo 80 caracteres.” conforme o caso

#### Scenario: Duplicata após normalização

- **WHEN** outra categoria da mesma residência equivale após ignorar caixa, diacríticos e espaços excedentes
- **THEN** a criação ou renomeação é rejeitada com “Já existe uma categoria com esse nome nesta casa.”
- **AND** restrições persistentes impedem duplicatas criadas simultaneamente

#### Scenario: Normalizar espaços

- **WHEN** o usuário informa espaços nas extremidades ou sequências internas
- **THEN** a aplicação remove espaços das extremidades e reduz sequências internas a um espaço
- **AND** preserva pontuação, acentos e caixa no nome exibido

#### Scenario: Renomear categoria em uso

- **WHEN** um membro autorizado renomeia categoria associada a itens
- **THEN** os itens continuam ligados à mesma categoria e passam a exibir o novo nome

### Requirement: Associar item a categoria da mesma residência

O sistema SHALL exigir categoria cadastrada da residência em cada novo item e validar residência da categoria no servidor.

#### Scenario: Categoria da residência

- **WHEN** um membro salva item com categoria da mesma residência
- **THEN** a relação é persistida e a interface exibe o nome da categoria

#### Scenario: Categoria de outra residência

- **WHEN** um pedido associa item à categoria de outra residência
- **THEN** a operação é rejeitada sem alterar o item

#### Scenario: Nenhuma categoria cadastrada

- **WHEN** a residência não tem categorias
- **THEN** o formulário não salva item sem categoria e não atribui `Outros` silenciosamente
- **AND** oferece acesso a `Gerenciar categorias`

### Requirement: Preservar categorias na migração

O sistema SHALL manter rótulos e associações legadas enquanto converte itens para categorias persistidas.

#### Scenario: Rótulo legado sem colisão

- **WHEN** a chave normalizada do rótulo é única naquela residência
- **THEN** o backfill cria ou reutiliza categoria equivalente e associa o item
- **AND** não altera silenciosamente o rótulo apresentado

#### Scenario: Rótulo equivalente a categoria inicial

- **WHEN** rótulo legado equivale a categoria inicial após normalização
- **THEN** o item é associado à categoria inicial
- **AND** o relatório registra rótulos de origem e mapeamento

#### Scenario: Colisão ambígua de rótulos customizados

- **WHEN** dois rótulos customizados diferentes resultam na mesma chave normalizada
- **THEN** o diagnóstico lista residência, rótulos, contagem e mapeamento proposto
- **AND** cutover aguarda aprovação do nome canônico
- **AND** nenhum rótulo é sobrescrito silenciosamente

#### Scenario: Rótulo vazio ou inválido

- **WHEN** item tem rótulo legado vazio ou inválido
- **THEN** o diagnóstico registra exceção e aguarda mapeamento aprovado
- **AND** não associa o item automaticamente a `Outros`

#### Scenario: Validar cutover

- **WHEN** o backfill conclui
- **THEN** a leitura nova só é ativada quando todo item tem categoria válida da mesma residência
- **AND** a coluna textual antiga continua preservada durante a primeira versão da relação

#### Scenario: Reexecutar seed ou backfill

- **WHEN** seed ou backfill é executado novamente
- **THEN** não cria categorias duplicadas nem altera mapeamentos aprovados

### Requirement: Remover somente categorias sem uso

O sistema SHALL permitir remoção física somente se nenhum item estiver associado à categoria.

#### Scenario: Categoria em uso

- **WHEN** um membro tenta remover categoria usada por item
- **THEN** o sistema rejeita a operação com “Esta categoria está sendo usada por itens da despensa. Reclassifique os itens antes de removê-la.”
- **AND** preserva todos os itens e relações

#### Scenario: Categoria sem uso

- **WHEN** membro autorizado remove categoria sem itens associados
- **THEN** a categoria deixa de estar disponível para novos itens

#### Scenario: Associação concorrente com remoção

- **WHEN** criação de item e remoção da categoria ocorrem simultaneamente
- **THEN** integridade referencial impede item órfão
- **AND** uma operação falha integralmente com mensagem compreensível

## Políticas da interface

- `Gerenciar categorias` abre modal acessível a partir da despensa.
- Usar “categorias cadastradas”; não há arquivamento nem estado `ativa/inativa`.
- `Outros` pode ser renomeada ou removida segundo as mesmas regras das demais.
