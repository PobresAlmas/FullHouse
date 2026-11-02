# Proposta: Gerenciar categorias da despensa

## Estado

Modelagem pronta para iniciar a implementação. O único gate dependente dos dados reais é aprovar mapeamentos de rótulos legados que colidam após normalização.

## Por quê

Hoje os itens da despensa dependem de rótulos de categoria em texto. Isso permite variações como `Grãos`, `graos` e `Grãos `, fragmentando filtros e dificultando a organização. Categorias persistidas por residência dão aos moradores um catálogo compartilhado e mantêm os itens existentes classificados.

## O que muda

- Criar, consultar, renomear e remover categorias da despensa por residência.
- Associar cada item da despensa a uma categoria persistida da mesma residência.
- Criar categorias iniciais por residência e permitir categorias personalizadas.
- Impedir a remoção de categorias ainda usadas por itens.
- Migrar os rótulos existentes em etapas, sem reclassificação silenciosa ou perda de dados.
- Abrir o gerenciamento de categorias a partir da despensa.

## Capacidade

### Nova

- `pantry-categories`: categorias persistidas por residência para organizar itens da despensa.

### Modificada

- Despensa: substituir o texto livre pela relação de categoria, preservando dados legados e exibindo o nome da categoria associada.
- Criação de residência: provisionar categorias iniciais.

## Decisões de produto

- As categorias pertencem à residência, nunca são globais.
- As categorias iniciais são Bebidas, Doces, Grãos, Higiene, Laticínios, Limpeza, Massas e Outros.
- Os nomes são únicos por residência ignorando caixa, acentos e espaços excedentes; o rótulo exibido preserva a capitalização e acentuação escolhidas.
- Categorias iniciais podem ser renomeadas e removidas como as demais, desde que sem itens associados.
- A remoção de categoria em uso é bloqueada; seus itens devem ser reclassificados primeiro.
- Sem política compartilhada existente que restrinja a gestão, qualquer membro ativo pode gerir categorias.
- Nenhum item legado recebe `Outros` automaticamente como fallback.

## Fora de escopo

- Categorias de compras ou de outros módulos.
- Arquivamento de categorias e recuperação de categorias removidas.
- Integração com lista de compras, notificações ou alterações em regras de estoque.
- Categorias compartilhadas entre residências.

## Gate de dados

Antes do cutover, diagnosticar rótulos por residência. Se rótulos legados diferentes colidirem após normalização e não houver categoria inicial que determine o nome canônico, apresentar o mapeamento proposto para aprovação. Manter a coluna textual antiga até todas as associações serem verificadas.
