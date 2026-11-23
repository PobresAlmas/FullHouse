# Sprint 03 — Implementação de colaboração da casa

**Responsável:** Iago<br>
**Módulo principal:** Chat da casa, mural de regras e reuniões<br>
**OpenSpec:** [Design da SPEC-002](../../../../openspec02/spec/002-colaboracao-da-casa/design.md)

## 1. Visão geral

A entrega reúne chat da residência, mural de regras e reuniões. As páginas privadas reutilizam a navegação e validam o contexto da casa. O servidor confere o vínculo ativo em cada operação e o papel de gestão nas alterações do mural.

## 2. Frontend

| Funcionalidade  | Arquivos                                                                                                                                                        | Comportamento                                                                                 |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Chat da casa    | [Página Chat](../../../../web/app/%28private%29/chat/page.tsx), [cliente HTTP e SSE](../../../../web/features/house-collaboration/api/chat.api.ts)              | Exibe histórico e autor. Ao reconectar, busca as mensagens após o último ID recebido.         |
| Mural de regras | [Página Regras](../../../../web/app/%28private%29/rules/page.tsx), [cliente do mural](../../../../web/features/house-collaboration/api/house-rules.api.ts)      | Mostra título, descrição, data, criador e editor. Gestores têm controles de criação e edição. |
| Reuniões        | [Página Reuniões](../../../../web/app/%28private%29/meetings/page.tsx), [cliente de reuniões](../../../../web/features/house-collaboration/api/meetings.api.ts) | Apresenta agenda, convites, respostas de presença e histórico de eventos por situação.        |

## 3. Backend

- [Chat](../../../../backend/src/chat/) resolve a conversa `CASA`, ordena o histórico, associa a autoria à participação autenticada e publica mensagens persistidas por SSE. A conexão limpa a inscrição ao desconectar e verifica periodicamente o vínculo ativo.
- [Mural](../../../../backend/src/house-rules/) filtra regras vigentes da casa. Criação e edição exigem gestor e gravam as participações autora e última editora.
- [Reuniões](../../../../backend/src/meetings/) cria eventos e convites para participantes ativos. As respostas dependem de convite e vínculo ativo. Reagendamento e cancelamento exigem o organizador.

## 4. Regras de persistência e validação

- A [migration do chat](../../../../backend/prisma/migrations/20261115000000_unique_house_conversation/migration.sql) garante uma conversa `CASA` por residência. A migração informa os identificadores quando encontra duplicatas para correção.
- Criação e reagendamento gravam a reunião e os convites em transação. O reagendamento preserva a reunião anterior como `REAGENDADA` e vincula a substituta. O cancelamento preserva o registro.
- A distribuição de mensagens por SSE usa memória local do backend. A distribuição entre múltiplas instâncias depende de um serviço compartilhado.

## 5. Rastreabilidade

- [Requisitos da Sprint 03](requisitos.md) e [tarefas da SPEC-002](../../../../openspec02/spec/002-colaboracao-da-casa/tasks.md).
- [Testes e capturas](testes.md#5-evidências) de chat, regras e reuniões.
