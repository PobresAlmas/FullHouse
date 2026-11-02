# Sprint 02 — Requisitos de categorias da despensa

**Responsável:** Calebe Mesquita<br>
**Módulo:** Despensa virtual — categorias<br>
**Capacidade OpenSpec:** `pantry-categories`<br>
**Requisito relacionado:** extensão do módulo RF022 — Despensa virtual / US020

## 1. Objetivo

Como morador, quero manter categorias da minha residência para classificar os itens da despensa, corrigir nomes e evitar variações duplicadas como “Grãos”, “graos” e “Grãos ”.

Esta entrega amplia a organização da despensa já documentada em `docs/sprints/sprint01/Calebe/`. Ela não cria uma nova história RF/US independente nos documentos consultados; os requisitos detalhados desta mudança estão no OpenSpec `manage-pantry-categories`.

## 2. Requisitos funcionais

### RF — Categorias por residência

- As categorias pertencem a uma residência e não são compartilhadas entre casas.
- Membros ativos podem consultar as categorias da residência.
- Criar, renomear e remover respeita a política central de criação/edição da residência.
- A residência recebe as categorias iniciais: Bebidas, Doces, Grãos, Higiene, Laticínios, Limpeza, Massas e Outros.
- As categorias iniciais podem ser renomeadas ou removidas se não tiverem itens associados.

### RF — CRUD, normalização e unicidade

- Permitir listar, criar, renomear e remover categorias.
- O nome deve conter de 1 a 80 caracteres depois de normalizar espaços.
- O nome exibido preserva caixa e acentos informados; a comparação de unicidade ignora caixa, acentos e espaços excedentes.
- Pontuação permanece significativa.
- Nomes equivalentes não podem coexistir na mesma residência, inclusive em criações concorrentes.
- Uma categoria em uso não pode ser removida; os itens devem ser reclassificados primeiro.

### RF — Associação dos itens

- Todo item novo da despensa precisa referenciar uma categoria cadastrada na mesma residência.
- A API rejeita categoria de outra residência ou categoria inexistente.
- Renomear categoria atualiza o nome apresentado pelos itens associados.
- Se não houver categorias disponíveis, o formulário não escolhe “Outros” silenciosamente e oferece acesso ao gerenciamento.

### RF — Preservação dos dados legados

- A migração associa rótulos antigos a categorias da mesma residência e mantém a coluna textual legada durante a transição.
- Rótulos equivalentes a categorias iniciais são associados à categoria inicial correspondente.
- Colisões customizadas ambíguas e rótulos vazios/bloqueados devem interromper a migração para análise, sem classificar os itens automaticamente como “Outros”.
- A migração não pode deixar item sem categoria nem criar associação entre residências diferentes.

## 3. Critérios de aceitação

1. A despensa consulta categorias persistidas da residência selecionada.
2. O morador autorizado consegue criar e renomear categorias, preservando o rótulo exibido.
3. Tentativas de criar/renomear duplicatas após normalização são rejeitadas.
4. A exclusão de categoria em uso é bloqueada sem remover ou alterar itens.
5. Um item só pode ser criado/alterado com categoria da mesma residência.
6. Residências novas recebem as oito categorias padrão de forma transacional.
7. A migração de itens existentes preserva rótulos e bloqueia dados inválidos ou ambíguos até tratamento explícito.

## 4. Base documental e pendência

- Proposta: `openspec/changes/manage-pantry-categories/proposal.md`.
- Decisões: `openspec/changes/manage-pantry-categories/design.md`.
- Requisitos e cenários: `openspec/changes/manage-pantry-categories/specs/pantry-categories/spec.md`.
- A API, a interface e os testes estão no repositório. O cutover depende de aplicar e validar a migração contra o banco local e seus dados reais; essa validação não foi concluída nesta entrega documental.
