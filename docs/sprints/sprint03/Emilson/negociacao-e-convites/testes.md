# Sprint 03 — Testes de negociação e convites

**Responsável:** Emilson<br>
**Módulo:** Quartos — interesses, conversa e convite residencial<br>
**OpenSpec:** [SPEC-004](../../../../../openspec02/spec/004-negociacao-e-convites/tasks.md)

## 1. Objetivo e estado da verificação

Verificar a autorização da conversa, o ciclo de interesse e convite e o contrato de notificações paginadas. As suítes HTTP e unitárias usam dependências simuladas. A migração também pode ser verificada em PostgreSQL.

Passaram **31 testes web**, **96 unitários**, **17 HTTP** e **1 teste de migração** na revisão de 23/11/2026. Na API com PostgreSQL descartável, uma conta externa à negociação recebeu acesso negado. A recusa só foi registrada para a conta destinatária e preservou sua situação de moradia.

## 2. Matriz de testes funcionais

| ID   | Cenário                                     | Resultado esperado                                                                   |
| ---- | ------------------------------------------- | ------------------------------------------------------------------------------------ |
| CT01 | Acompanhar, aceitar ou recusar um interesse | A lista pertence à conta autenticada e apenas o aceite habilita uma negociação.      |
| CT02 | Enviar mensagem e consultar como terceiro   | As partes abrem a conversa e o terceiro recebe acesso negado.                        |
| CT03 | Enviar, aceitar ou recusar um convite       | Gestor envia, destinatário responde e o vínculo muda somente após aceite confirmado. |
| CT04 | Consultar e marcar avisos                   | A resposta usa o destinatário da sessão e respeita o limite, o cursor e o filtro.    |

## 3. Arquivos de teste

- [Tela da negociação](../../../../../web/features/rooms/components/__test__/RoomNegotiationPage.test.tsx), [cliente de Quartos](../../../../../web/features/rooms/api/__test__/rooms.api.test.ts) e [sino](../../../../../web/features/notifications/components/__test__/NotificationBell.test.tsx).
- [Serviço de Quartos](../../../../../backend/src/rooms/rooms.service.spec.ts), [repositório](../../../../../backend/src/rooms/rooms.repository.spec.ts) e [notificações](../../../../../backend/src/notifications/).
- [HTTP de Quartos](../../../../../backend/test/rooms.e2e-spec.ts), [HTTP de Notificações](../../../../../backend/test/notifications.e2e-spec.ts) e [migração](../../../../../backend/test/integration/room-negotiations-migration.integration.test.ts).

## 4. Comandos para executar os testes

Rode na raiz do FullHouse com Node.js 26.8.1.

```bash
pnpm --dir web exec vitest run features/rooms features/notifications app/rooms
pnpm --dir backend exec vitest run src/rooms src/notifications
pnpm --dir backend run test:e2e test/rooms.e2e-spec.ts test/notifications.e2e-spec.ts
```

Para conferir a migração, use `TEST_DATABASE_URL` com um banco descartável e execute:

```bash
pnpm --dir backend exec vitest run --config vitest.config.integration.ts test/integration/room-negotiations-migration.integration.test.ts
```

## 5. Roteiro de teste manual e evidências

Salve os prints dos comandos em [`evidencias/`](evidencias/) com os nomes `testes-front.png`, `testes-backend.png`, `testes-backend-e2e.png` e, para a migração, `testes-integracao-postgres.png`.

No navegador, use sessões separadas para anunciante e interessado. Registre um interesse, aceite-o em **Anúncios da casa → Interessados**, abra a conversa em **Meus interesses** e troque mensagens. Envie o convite como gestor e responda na outra sessão. Registre a conversa e a resposta como `negociacao.png` e `convite.png`.
