# Sprint 02 — Requisitos da lista de compras

**Responsável:** Calebe Mesquita<br>
**Módulo:** Lista de compras compartilhada<br>
**Capacidade OpenSpec:** `shopping-list`

## 1. Objetivo

Como morador, quero manter uma lista de compras compartilhada com as pessoas da minha residência, para organizar o que ainda precisa ser comprado e acompanhar o que já foi comprado.

Esta entrega está especificada em `openspec/changes/add-shopping-list/`. Os arquivos disponíveis não associam esta capacidade a um identificador RF/US do documento acadêmico; por isso, nenhum identificador foi criado nesta documentação.

## 2. Requisitos funcionais

### RF — Acesso compartilhado por residência

- Cada item pertence diretamente a uma residência; não existem listas nomeadas separadas.
- Todo morador com vínculo ativo pode consultar e operar os itens da lista da residência.
- Cada consulta ou alteração deve validar no servidor o vínculo ativo e o escopo da residência.
- A lista e seus itens não devem ser acessíveis por usuários sem vínculo ativo.

### RF — Ciclo de vida do item

- Permitir criar, consultar, editar, marcar como comprado, reabrir e remover itens.
- A criação sempre começa no estado `PENDENTE`.
- Um item comprado permanece na lista até ser removido explicitamente.
- A conclusão registra quem concluiu e quando; reabrir limpa esses dados e preserva a autoria e a data de criação.
- A lista não atualiza a despensa nem cria lançamentos financeiros.

### RF — Dados e validações

- O nome é obrigatório e aceita até 100 caracteres após a normalização dos espaços.
- Quantidade e unidade são opcionais em conjunto; quando informada, a quantidade deve ser maior que zero e ter até três casas decimais.
- As unidades permitidas são `UNIDADE`, `KG`, `G`, `L`, `ML` e `PACOTE`.
- A observação é opcional e aceita até 500 caracteres.
- A interface em português aceita vírgula decimal.
- Nomes equivalentes a itens pendentes geram aviso, mas duplicatas intencionais continuam permitidas e não são mescladas.

### RF — Concorrência e estados

- Edição, conclusão, reabertura e remoção usam a versão atual do item para evitar sobrescrever alterações de outro morador.
- Conflitos devem ser informados sem substituir silenciosamente a versão mais recente.
- A interface diferencia carregamento, lista vazia, ausência de itens pendentes e falha de consulta.
- Ao trocar de residência, a interface limpa o contexto anterior e ignora respostas atrasadas.

## 3. Critérios de aceitação

1. Moradores ativos veem os itens apenas da residência selecionada.
2. É possível criar um item apenas com nome ou informar também quantidade, unidade e observação válidas.
3. A interface avisa sobre nome equivalente pendente e permite cancelar ou confirmar uma nova entrada separada.
4. Moradores podem editar, concluir, reabrir e remover itens, com confirmação para remoção.
5. Alterações baseadas em versão antiga geram conflito e não apagam a mudança mais recente.
6. Itens comprados registram a conclusão atual e continuam acessíveis na seção de comprados.
7. A lista não altera estoque nem financeiro.

## 4. Base documental

- Proposta: `openspec/changes/add-shopping-list/proposal.md`.
- Decisões de projeto: `openspec/changes/add-shopping-list/design.md`.
- Requisitos e cenários: `openspec/changes/add-shopping-list/specs/shopping-list/spec.md`.
