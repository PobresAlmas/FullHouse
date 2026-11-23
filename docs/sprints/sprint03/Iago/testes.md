# Sprint 03 — Testes de colaboração da casa

**Responsável:** Iago<br>
**Módulo:** Chat da casa, mural de regras e reuniões<br>
**OpenSpec:** [SPEC-002](../../../../openspec02/spec/002-colaboracao-da-casa/tasks.md)

## 1. Objetivo e estado da verificação

Conferir interação no navegador, validação HTTP e regras de colaboração no backend. Os testes unitários e de contrato usam dependências simuladas. A suíte opcional da migration usa PostgreSQL.

## 2. Matriz de testes funcionais

| ID   | Cenário                                | Resultado esperado                                                                                                          |
| ---- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| CT01 | Enviar mensagem e reconectar o chat    | Moradores ativos recebem mensagens da própria casa e recuperam as que perderam. A revogação do vínculo interrompe o acesso. |
| CT02 | Consultar e alterar regras             | A listagem mostra regras vigentes. Gestores podem cadastrar ou editar com autoria registrada.                               |
| CT03 | Agendar reunião e responder à presença | Um convite é registrado para cada membro ativo e somente o convidado ativo responde pelo próprio convite.                   |
| CT04 | Reagendar ou cancelar                  | O organizador realiza a ação. A reunião anterior permanece no histórico.                                                    |
| CT05 | Tentar acessar dados de outra casa     | A API rejeita a consulta ou a ação e protege os dados da residência.                                                        |

## 3. Arquivos de teste

| Suíte                 | Arquivos                                                                                                                                                                                                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend              | [Chat](../../../../web/app/%28private%29/chat/__test__/page.test.tsx), [Regras](../../../../web/app/%28private%29/rules/__test__/page.test.tsx), [Reuniões](../../../../web/app/%28private%29/meetings/__test__/page.test.tsx) e [clientes de colaboração](../../../../web/features/house-collaboration/api/__tests__/collaboration.api.test.ts). |
| Backend unitário      | [Chat](../../../../backend/test/unit/chat/), [Regras](../../../../backend/test/unit/house-rules/) e [Reuniões](../../../../backend/test/unit/meetings/).                                                                                                                                                                                          |
| Backend HTTP          | [Chat](../../../../backend/test/chat.e2e-spec.ts), [Regras](../../../../backend/test/house-rules.e2e-spec.ts) e [Reuniões](../../../../backend/test/meetings.e2e-spec.ts).                                                                                                                                                                        |
| Integração PostgreSQL | [Unicidade da conversa da casa](../../../../backend/test/integration/house-conversation-migration.integration.test.ts).                                                                                                                                                                                                                           |

## 4. Comandos e resultados

Execute na raiz do FullHouse com Node.js 26.8.1 e as [dependências do projeto](../../../../README.md#subir-localmente) instaladas.

### Frontend

```bash
pnpm --dir web exec vitest run "app/(private)/chat" "app/(private)/rules" "app/(private)/meetings" features/house-collaboration
```

### Backend unitário

```bash
pnpm --dir backend exec vitest run test/unit/chat --reporter=verbose
pnpm --dir backend exec vitest run test/unit/house-rules --reporter=verbose
pnpm --dir backend exec vitest run test/unit/meetings --reporter=verbose
```

### Backend HTTP

```bash
pnpm --dir backend run test:e2e test/chat.e2e-spec.ts test/house-rules.e2e-spec.ts test/meetings.e2e-spec.ts
```

### Integração PostgreSQL (opcional)

Com `TEST_DATABASE_URL` apontando para um banco exclusivo de testes preparado para o cenário da migration:

```bash
pnpm --dir backend exec vitest run --config vitest.config.integration.ts test/integration/house-conversation-migration.integration.test.ts
```

Na revisão de 23/11/2026, passaram **16 testes web**, **27 unitários**, **10 HTTP** e **2 de integração da migration** em PostgreSQL descartável. O registro original de **25 testes unitários** e **10 HTTP** consta na [documentação da Sprint 02](../../sprint02/Iago/colaboracao-casa/testes.md).

## 5. Evidências

- [Testes unitários de chat](evidencias/testes-backend-chat.png).
- [Testes unitários de regras](evidencias/testes-backend-regras.png).
- [Testes unitários de reuniões](evidencias/testes-backend-reunioes.png).
