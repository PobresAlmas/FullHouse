# Sprint 03 — Implementação de colaboração da casa

**Responsável:** Iago  
**Módulos:** Chat da casa, mural de regras e reuniões

## 1. Visão geral

Foram implementados os requisitos RF011, RF012 e RF013. As operações são protegidas por autenticação e validam a participação ativa do usuário na residência selecionada. As telas privadas usam a navegação e o contexto de residência do sistema.

## 2. Chat da casa

O backend está em `backend/src/chat/`. O módulo consulta ou cria a conversa da residência, lista mensagens em ordem cronológica, associa o autor à participação autenticada e publica mensagens persistidas por SSE. A conexão é encerrada após a perda de participação e limpa os recursos quando o cliente desconecta. Uma migration garante uma única conversa da casa por residência.

A interface está em `web/app/(private)/chat/page.tsx`; o cliente e os tipos estão em `web/features/house-collaboration/api/chat.api.ts`. Após reconectar, a tela busca mensagens posteriores à última recebida.

## 3. Mural de regras

O backend está em `backend/src/house-rules/`. A listagem retorna regras vigentes da residência, e as operações de criação e edição registram as participações autora e última editora.

A tela `web/app/(private)/rules/page.tsx` apresenta título, descrição, data, criador e editor da regra.

## 4. Reuniões

O backend está em `backend/src/meetings/`. Agendamento e reagendamento registram a reunião e os convites pendentes dos membros ativos em transação. Respostas exigem um convite existente e participação ativa. Reagendar preserva a reunião anterior como `REAGENDADA` e cria um novo evento associado; cancelar é permitido somente ao organizador e preserva o histórico.

A tela está em `web/app/(private)/meetings/page.tsx`; o cliente HTTP está em `web/features/house-collaboration/api/meetings.api.ts`.

## 5. Persistência e limites técnicos

- A migration `backend/prisma/migrations/20261115000000_unique_house_conversation/migration.sql` impede conversas duplicadas do tipo casa por residência. Se encontrar duplicatas, interrompe a aplicação e informa os identificadores para resolução.
- O envio ao vivo por SSE usa memória local e pressupõe uma instância do backend. Uma implantação com múltiplas instâncias precisará de um broker compartilhado.
- A conexão SSE verifica periodicamente se o usuário ainda tem participação ativa.

## 6. Rastreabilidade

| Funcionalidade | Implementação principal | Evidência |
| --- | --- | --- |
| Chat e mensagens ao vivo | `backend/src/chat/` e `web/app/(private)/chat/` | `docs/sprints/sprint03/Iago/Chat/image.png` |
| Regras da residência | `backend/src/house-rules/` e `web/app/(private)/rules/` | `docs/sprints/sprint03/Iago/Regras/image.png` |
| Reuniões e convites | `backend/src/meetings/` e `web/app/(private)/meetings/` | `docs/sprints/sprint03/Iago/Reuniões/image.png` |

Os arquivos de testes, comandos e resultados estão em `docs/sprints/sprint03/Iago/testes.md`.
