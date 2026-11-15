# Sprint 02 — Implementação de colaboração da casa

**Responsável:** Iago  
**Módulos:** Chat da casa, mural de regras e reuniões

## 1. Visão geral

As três funcionalidades reutilizam os modelos Prisma já existentes. Cada operação verifica a participação ativa na residência autenticada. As páginas privadas usam a seleção de residência e a navegação compartilhadas da aplicação.

## 2. Chat da casa

O módulo Nest está em `backend/src/chat/`. Ele resolve ou cria a conversa `CASA`, lista mensagens por data/ID, grava o autor a partir da participação autenticada e publica mensagens persistidas pelo stream SSE. O stream encerra após perda de participação e remove a inscrição quando o cliente desconecta. A migration `backend/prisma/migrations/20261115000000_unique_house_conversation/migration.sql` impede mais de uma conversa `CASA` por residência e falha com IDs para resolução manual quando encontra duplicatas.

A página privada está em `web/app/(private)/chat/page.tsx`; cliente e tipos estão em `web/features/house-collaboration/api/chat.api.ts`. Ao reconectar, o cliente busca mensagens após o último ID recebido.

## 3. Mural de regras

O módulo Nest está em `backend/src/house-rules/`. A listagem filtra regras vigentes de escopo `CASA`; criação e edição gravam as participações autora e última editora. A página privada `web/app/(private)/rules/page.tsx` exibe título, descrição, data, criador e editor.

## 4. Reuniões

O módulo Nest está em `backend/src/meetings/`. Criação e reagendamento gravam reunião e convites pendentes para os membros ativos dentro de transações. Respostas exigem participação ativa e convite existente. Reagendamento marca a reunião original como `REAGENDADA`, cria sua substituta vinculada e não apaga histórico. Cancelamento só é permitido ao organizador.

A página privada está em `web/app/(private)/meetings/page.tsx`; o cliente HTTP está em `web/features/house-collaboration/api/meetings.api.ts`.

## 5. Limites técnicos

- O fan-out SSE é em memória e pressupõe uma instância do backend; múltiplas instâncias exigirão broker compartilhado.
- A remoção de acesso é verificada no stream em intervalos de 15 segundos.
- O índice parcial da migration requer PostgreSQL e deve ser aplicado com `pnpm exec prisma migrate deploy` após resolver duplicatas apontadas pela migration.

## 6. Rastreabilidade

Os testes por módulo e resultados disponíveis estão em `docs/sprints/sprint02/Iago/colaboracao-casa/testes.md`.
