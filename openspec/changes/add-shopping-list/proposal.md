# Proposta: Lista de compras compartilhada

## Estado

Modelagem inicial pronta para implementação. As decisões de produto estão descritas em `design.md` e verificadas pelos cenários de `specs/shopping-list/spec.md`.

## Por quê

Os moradores precisam organizar, no mesmo lugar, os itens que a casa ainda precisa comprar. Uma lista compartilhada evita listas paralelas e deixa visível o que continua pendente.

## O que muda

- Criar uma única lista compartilhada por residência, com itens pertencentes diretamente à casa.
- Permitir criar, consultar, editar, marcar como comprado, reabrir e remover itens.
- Permitir que qualquer morador com vínculo ativo opere qualquer item da lista.
- Exibir pendentes e comprados em seções separadas; manter itens comprados até remoção explícita.
- Detectar nomes possivelmente repetidos e pedir confirmação sem mesclar itens.
- Adicionar acesso `Lista de compras` à navegação autenticada.

## Capacidade

### Nova

- `shopping-list`: lista colaborativa de compras por residência.

### Modificada

- Navegação autenticada: acesso à lista de compras.

## Fora de escopo

- Atribuir a compra a um morador.
- Criar listas nomeadas, recorrência ou histórico de listas anteriores.
- Atualizar estoque da despensa ou gerar despesa ao marcar um item como comprado.
- Notificações, atualização em tempo real, preços, orçamento, fornecedores ou integração externa.
- Histórico completo das transições: a aplicação registra somente a conclusão atual.
