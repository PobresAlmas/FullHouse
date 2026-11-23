# Sprint 03 — Testes de paginação da negociação

**Responsável:** Emilson<br>
**Módulo:** Quartos — histórico da conversa privada<br>
**OpenSpec:** [SPEC-005](../../../../../openspec02/spec/005-paginacao-da-negociacao/tasks.md)

## 1. Objetivo e estado da verificação

Conferir o cursor, a ordenação, a composição das páginas e o comportamento da interface durante a leitura.

Passaram **8 testes web**, **10 unitários** e **14 HTTP de Quartos** na revisão de 23/11/2026. Os testes HTTP fazem parte da execução conjunta com a SPEC-004.

Na API com PostgreSQL descartável, uma negociação com 32 mensagens, incluindo mensagens com o mesmo horário, retornou 30 registros na primeira página e 2 na seguinte, com 32 IDs distintos.

## 2. Matriz de testes funcionais

| ID   | Cenário                                    | Resultado esperado                                                             |
| ---- | ------------------------------------------ | ------------------------------------------------------------------------------ |
| CT01 | Abrir conversa e consultar página anterior | A página recente aparece primeiro e o histórico segue antes do cursor.         |
| CT02 | Consultar mensagens com datas iguais       | A ordenação por data e ID mantém a paginação estável.                          |
| CT03 | Usar cursor inválido ou de outra conversa  | A API rejeita a consulta.                                                      |
| CT04 | Carregar mais histórico na interface       | O histórico é inserido acima e a posição de leitura é preservada.              |
| CT05 | Simular falha na página anterior           | Mensagens já carregadas permanecem disponíveis e a consulta pode ser repetida. |

## 3. Arquivos de teste

- [Componente](../../../../../web/features/rooms/components/__test__/RoomNegotiationPage.test.tsx) e [cliente HTTP](../../../../../web/features/rooms/api/__test__/rooms.api.test.ts).
- [DTO](../../../../../backend/src/rooms/dto/room-negotiation-messages-query.dto.spec.ts), [repositório](../../../../../backend/src/rooms/rooms.repository.pagination.spec.ts) e [contrato HTTP de Quartos](../../../../../backend/test/rooms.e2e-spec.ts).

## 4. Comandos para executar os testes

Rode na raiz do FullHouse com Node.js 26.8.1.

```bash
pnpm --dir web exec vitest run features/rooms/components/__test__/RoomNegotiationPage.test.tsx features/rooms/api/__test__/rooms.api.test.ts
pnpm --dir backend exec vitest run src/rooms/dto/room-negotiation-messages-query.dto.spec.ts src/rooms/rooms.repository.pagination.spec.ts
pnpm --dir backend run test:e2e test/rooms.e2e-spec.ts
```

A suíte HTTP de Quartos é compartilhada com negociação e convites.

## 5. Roteiro de teste manual e evidências

Salve os prints em [`evidencias/`](evidencias/) como `testes-front.png`, `testes-backend.png` e `testes-backend-e2e.png`. Na conversa com mais de 30 mensagens, capture a página recente e depois acione **Carregar mensagens anteriores**. Confira a posição do trecho em leitura e salve como `historico-paginado.png`.
