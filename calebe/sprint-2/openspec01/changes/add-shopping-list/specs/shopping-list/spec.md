# Spec Delta — Lista de compras

## Purpose

Definir uma lista compartilhada de itens a comprar por residência, acessível a todos os moradores com vínculo ativo.

## ADDED Requirements

### Requirement: Isolamento por residência

O sistema SHALL validar o vínculo ativo do usuário à residência em toda consulta ou alteração da lista.

#### Scenario: Membro ativo consulta a lista

- **WHEN** um membro ativo consulta a lista da residência a que pertence
- **THEN** o sistema retorna somente itens daquela residência

#### Scenario: Usuário sem vínculo ativo

- **WHEN** um usuário sem vínculo ativo consulta ou altera a lista
- **THEN** o sistema nega a operação sem revelar itens nem dados dos autores

#### Scenario: Troca de residência durante carregamento

- **WHEN** o usuário troca de residência enquanto uma consulta está em andamento
- **THEN** a interface limpa os dados e formulários anteriores
- **AND** descarta respostas atrasadas do contexto anterior

### Requirement: Criar item

O sistema SHALL permitir que um membro ativo crie item na lista compartilhada.

#### Scenario: Criar somente com nome

- **WHEN** o membro informa nome válido e deixa quantidade, unidade e observação vazias
- **THEN** o item é criado como `PENDENTE`
- **AND** residência, criador e data de criação são definidos pelo servidor

#### Scenario: Validar nome

- **WHEN** o nome é vazio, contém apenas espaços ou excede 100 caracteres após trim
- **THEN** o sistema rejeita a criação
- **AND** informa “Informe o nome do item.” ou “O nome deve ter no máximo 100 caracteres.” conforme o caso

#### Scenario: Status inicial

- **WHEN** o cliente envia uma criação
- **THEN** o status inicial é sempre `PENDENTE`
- **AND** o cliente não consegue criar diretamente como `COMPRADO`

#### Scenario: Quantidade e unidade válidas

- **WHEN** o membro informa quantidade maior que zero e unidade `UNIDADE`, `KG`, `G`, `L`, `ML` ou `PACOTE`
- **THEN** o sistema aceita até três casas decimais dentro do limite de `Decimal(12,3)`
- **AND** a interface aceita vírgula decimal em pt-BR

#### Scenario: Quantidade inválida

- **WHEN** a quantidade é zero, negativa, não numérica, fora do limite ou tem mais de três casas decimais
- **THEN** o sistema rejeita a criação com a validação correspondente

#### Scenario: Quantidade sem unidade

- **WHEN** a quantidade está preenchida e a unidade vazia
- **THEN** o sistema rejeita a criação e informa “Selecione a unidade da quantidade informada.”

#### Scenario: Unidade sem quantidade

- **WHEN** a unidade está preenchida e a quantidade vazia
- **THEN** o sistema rejeita a criação e informa “Informe a quantidade para usar uma unidade.”

#### Scenario: Observação

- **WHEN** a observação tem até 500 caracteres após trim
- **THEN** o sistema salva o texto
- **AND** rejeita texto maior com “A observação deve ter no máximo 500 caracteres.”

### Requirement: Avisar sobre nome repetido sem mesclar itens

O sistema SHALL permitir duplicatas intencionais e não mesclar registros.

#### Scenario: Existe pendente de nome equivalente

- **WHEN** o membro informa nome equivalente a outro pendente da residência
- **THEN** a interface mostra “Já existe um item pendente com esse nome. Deseja adicionar outro?”
- **AND** oferece “Adicionar mesmo assim” e “Cancelar”

#### Scenario: Confirmar duplicata

- **WHEN** o membro confirma a inclusão
- **THEN** o sistema cria outro item separado sem modificar o existente

#### Scenario: Cancelar duplicata

- **WHEN** o membro cancela o aviso
- **THEN** a interface não envia a criação
- **AND** mantém os dados existentes

#### Scenario: Equivalência de nomes

- **WHEN** dois nomes diferem apenas em caixa, acentos ou espaços excedentes
- **THEN** a interface os considera equivalentes para o aviso
- **AND** pontuação permanece significativa

#### Scenario: Equivalente já comprado

- **WHEN** existe somente equivalente com status `COMPRADO`
- **THEN** a interface não apresenta aviso de duplicata pendente

#### Scenario: Evitar duplo envio

- **WHEN** a submissão do formulário está em andamento
- **THEN** a interface impede nova submissão pelo mesmo formulário

### Requirement: Editar item

O sistema SHALL permitir que qualquer membro ativo edite qualquer item da lista da residência.

#### Scenario: Edição com versão atual

- **WHEN** o membro envia alteração com a versão atual
- **THEN** o sistema salva os campos permitidos, preserva residência e autoria de criação, e incrementa a versão

#### Scenario: Edição desatualizada

- **WHEN** a versão enviada difere da versão persistida
- **THEN** o sistema retorna conflito sem sobrescrever a alteração mais recente

### Requirement: Concluir e reabrir item

O sistema SHALL registrar somente a conclusão atual do item.

#### Scenario: Concluir item

- **WHEN** um membro ativo conclui item pendente usando a versão atual
- **THEN** o status passa para `COMPRADO`
- **AND** o sistema registra participação e horário da conclusão e incrementa versão
- **AND** não altera estoque ou financeiro

#### Scenario: Reabrir item

- **WHEN** um membro ativo reabre item comprado usando a versão atual
- **THEN** o status passa para `PENDENTE`
- **AND** participação e horário da conclusão são limpos, preservando criador e data de criação

#### Scenario: Repetir status atual

- **WHEN** o item já está no status solicitado
- **THEN** a operação não altera autoria, horário ou versão

#### Scenario: Transição com versão desatualizada

- **WHEN** o membro conclui ou reabre usando versão desatualizada
- **THEN** o sistema retorna conflito sem sobrescrever o estado atual

### Requirement: Remover item

O sistema SHALL permitir que qualquer membro ativo remova fisicamente item da lista.

#### Scenario: Confirmar remoção

- **WHEN** o membro confirma “Remover este item da lista? Esta ação não pode ser desfeita.” com a versão atual
- **THEN** o item deixa de aparecer na lista
- **AND** dados da despensa e do financeiro não são alterados

#### Scenario: Cancelar remoção

- **WHEN** o membro cancela a confirmação
- **THEN** o item permanece inalterado

#### Scenario: Remover com versão desatualizada

- **WHEN** a versão da remoção está desatualizada
- **THEN** o sistema retorna conflito e não remove o estado mais recente

#### Scenario: Item removido

- **WHEN** um cliente edita ou conclui item que já foi removido
- **THEN** o sistema informa que o item não está mais disponível e não o recria

### Requirement: Manter itens da residência após saída de morador

O sistema SHALL tratar itens como propriedade da residência, não de quem os criou.

#### Scenario: Criador deixa a residência

- **WHEN** o vínculo do criador é encerrado
- **THEN** o criador perde acesso à lista
- **AND** os itens permanecem disponíveis aos membros ativos restantes

#### Scenario: Participação histórica removida

- **WHEN** a participação de autoria deixa de existir
- **THEN** o item não é apagado e a interface pode mostrar “Usuário indisponível”

### Requirement: Exibir seções e estados

O sistema SHALL separar itens pendentes e comprados e diferenciar carregamento, vazio e falha.

#### Scenario: Ordenação

- **WHEN** a lista contém itens
- **THEN** pendentes aparecem primeiro por criação mais recente
- **AND** comprados aparecem depois por conclusão mais recente
- **AND** empates usam ordenação estável por identificador

#### Scenario: Lista vazia

- **WHEN** não existe item
- **THEN** a interface mostra “Sua lista de compras está vazia.” e ação “Adicionar item”

#### Scenario: Sem pendentes

- **WHEN** não há pendentes, mas há comprados
- **THEN** a interface mostra “Nenhum item pendente.” e mantém comprados acessíveis

#### Scenario: Falha de consulta

- **WHEN** a consulta falha
- **THEN** a interface mostra “Não foi possível carregar a lista de compras.” e ação “Tentar novamente”
- **AND** não apresenta a falha como lista vazia
