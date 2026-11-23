# SPEC-005 — Design

**Estado:** paginação e layout da conversa marcados como concluídos no registro original.

## Dependências

- [SPEC-004 — Negociação de quartos e convites](../004-negociacao-e-convites/requirements.md) e autorização de mensagens por participante.
- Controller, DTO, serviço e repositório do módulo [rooms](../../../backend/src/rooms/).
- [Cliente HTTP de Quartos](../../../web/features/rooms/api/rooms.api.ts) e [RoomNegotiationPage](../../../web/features/rooms/components/RoomNegotiationPage.tsx).

## Fluxo principal

1. Consultar `GET /rooms/negotiations/:id/messages` sem cursor para obter a página mais recente.
2. Autorizar a conversa, validar os parâmetros e consultar mais uma linha que o limite para saber se existe página anterior. Retornar as mensagens da página em ordem cronológica.
3. Mostrar a mensagem mais recente ao abrir. Ao carregar mais, enviar `before` com o cursor retornado e `limit` quando configurado.
4. Antes de inserir o histórico anterior, registrar a altura da lista e a posição da rolagem. Após renderizar, ajustar a posição pela diferença de altura.
5. Atualização manual busca a página mais recente. O envio bem-sucedido mantém a leitura no fim da lista.

## Fluxos alternativos

- Cursor inválido ou de outra negociação é recusado após validar o acesso à conversa. Conta sem acesso mantém a resposta de autorização anterior.
- Histórico vazio ou última página retorna `hasMore: false` e cursor nulo. Página inicial menor que a área disponível mantém o botão de carregar anteriores sempre que houver dados.
- Uma consulta em andamento bloqueia pedidos repetidos. Em caso de erro, manter o histórico e permitir que a pessoa tente novamente.

## Interface gráfica

- No desktop, a página limita o conjunto ao tamanho da janela, com barra lateral visível e conteúdo em coluna. A lista de mensagens tem rolagem própria e o compositor fica fora dela.
- Em telas menores, manter a rolagem da página e limitar a área de mensagens para preservar navegação e acesso ao compositor.
- Oferecer carregamento por rolagem e um controle explícito acessível por teclado.

## Componentes sugeridos

| Área               | Ponto de integração                                                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parâmetros         | [DTO de consulta de mensagens](../../../backend/src/rooms/dto/room-negotiation-messages-query.dto.ts) e [controller](../../../backend/src/rooms/room-negotiations.controller.ts) |
| Consulta           | [RoomsRepository](../../../backend/src/rooms/rooms.repository.ts) e [RoomsService](../../../backend/src/rooms/rooms.service.ts)                                                  |
| Estado da conversa | Cliente HTTP de Quartos e componente de página da negociação                                                                                                                     |

## Integração e persistência

- `before` é o ID da mensagem mais antiga da página anterior, sempre pertencente à negociação autorizada. `limit` é opcional, com padrão 30 e intervalo de 1 a 50.
- Consultar em ordem decrescente por horário de envio e ID. Excluir o cursor, usar a linha adicional só para calcular `hasMore` e inverter a página antes de retorná-la. `nextCursor` aponta para a mensagem mais antiga retornada quando houver outra página.
- O cursor pelo identificador existente mantém a consulta sem estado e evita que novas mensagens desloquem páginas, como ocorreria com offset.
- A implantação disponibiliza primeiro parâmetros opcionais e metadados no backend e depois o cliente. Na reversão do frontend, manter os parâmetros e os metadados para compatibilidade. A paginação não depende de migração, índice novo ou dependência extra.

## Estados da interface

Carregamento inicial, vazio, página disponível, carregamento de anteriores, última página e erro recuperável. Os estados de autorização, envio e atualização manual mantêm o contrato da negociação privada.

## Decisões implementadas

- Ordenação por data e ID mantém limites determinísticos mesmo com datas iguais.
- Preservar a leitura pela diferença de altura do contêiner, com carregamento automático e manual.
- Ajustar o layout na própria página, preservando o comportamento das outras páginas e da barra lateral compartilhada.

## Rastreabilidade

| Requisitos             | Design                                                              | Critérios  |
| ---------------------- | ------------------------------------------------------------------- | ---------- |
| RF01–RF02, RNF01–RNF02 | Cursor validado, ordenação, limites e metadados                     | CA01–CA03  |
| RF03, RNF03            | Inserção de páginas com posição de leitura preservada               | CA01, CA04 |
| RF04                   | Rolagem própria e layout responsivo                                 | CA05–CA06  |
| RF05                   | Bloqueio de pedidos duplicados, nova tentativa, atualização e envio | CA04, CA07 |
