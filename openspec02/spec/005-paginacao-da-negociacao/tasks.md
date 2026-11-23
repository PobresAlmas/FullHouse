# SPEC-005 — Tarefas

Use este checklist como pedido de implementação. Consulte [requirements.md](requirements.md) e [design.md](design.md) antes de começar. Os estados foram preservados da change de origem.

## Paginação no backend

- [x] **T01 — Validar parâmetros de paginação.** Adicionar `before` e `limit` ao endpoint de mensagens. Testar valores padrão, limites e entradas inválidas no DTO e no controller. **Refs:** RF01–RF02, RNF02, CA01, CA03.
- [x] **T02 — Paginar no repositório e expor metadados.** Usar cursor estável e retornar `hasMore` e `nextCursor` no serviço. Cobrir ordem cronológica, datas iguais, páginas vazias ou finais e cursores de outra negociação. **Refs:** RF01–RF02, RNF01–RNF02, CA01–CA03.
- [x] **T03 — Documentar o contrato paginado.** Documentar consulta e resposta no README de Quartos e verificar os testes focados de backend. **Refs:** RF01–RF02, CA01–CA03.

## Histórico e layout no frontend

- [x] **T04 — Atualizar o cliente HTTP.** Acrescentar parâmetros e metadados da paginação. Testar a consulta inicial e a consulta de páginas anteriores. **Refs:** RF01–RF02, CA01–CA02.
- [x] **T05 — Carregar anteriores preservando leitura.** Carregar a página mais recente, oferecer histórico anterior automático e por acionamento acessível e tratar pedidos simultâneos e erros. Testar união cronológica, restauração de posição e nova tentativa. **Refs:** RF03, RF05, RNF03, CA01, CA04, CA07.
- [x] **T06 — Restringir a rolagem no desktop.** Manter a barra lateral visível e a área de mensagens com rolagem própria. Preservar o uso em telas menores e verificar o layout nos testes focados de componente. **Refs:** RF04, RNF03, CA05–CA06.

## Verificação integrada

- [x] **T07 — Verificar integração e builds.** Executar testes focados de backend e frontend e os dois builds. Conferir paginação e barra lateral sem regressões na busca e nos chats de casa ou subgrupos. **Refs:** RF01–RF05, RNF01–RNF03, CA01–CA07.

## Verificação registrada

O checklist original registra como concluídos os testes focados, os dois builds e a conferência da integração. O [README de Quartos](../../../backend/src/rooms/README.md) descreve o contrato e as suítes focadas incluem os [testes de paginação do repositório](../../../backend/src/rooms/rooms.repository.pagination.spec.ts) e da [página de negociação](../../../web/features/rooms/components/__test__/RoomNegotiationPage.test.tsx).
