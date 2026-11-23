# SPEC-004 — Design

**Estado:** negociação privada, convites e notificações marcados como concluídos no registro original.

## Dependências

- Anúncios e interesses vinculados à residência. A publicação e a gestão dos anúncios na aba Moradores são descritas na [SPEC-001](../001-anunciar-quarto/requirements.md).
- NestJS, autenticação por sessão, papéis de gestão e modelos Prisma de `interesse_anuncio`, `convite_casa`, `participacao` e `notificacao`.
- O chat da casa e o de subgrupos usam `conversa` e `mensagem`, cujos autores são participações residenciais. A negociação privada usa modelos próprios para admitir o interessado antes da entrada na casa.

## Fluxo principal

1. Aceitar o interesse e criar ou recuperar sua negociação numa transação. Registrar o aviso da pessoa interessada com link para a conversa.
2. O interessado abre a negociação a partir de **Meus interesses**. O anunciante abre a mesma conversa pelo próprio anúncio.
3. Validar a identidade dos dois usuários em cada leitura e envio de mensagens. Obter a autoria da sessão.
4. O anunciante gestor envia o convite direcionado à pessoa da negociação. O sistema persiste uma notificação com ações para o destinatário.
5. Verificar destinatário e estado pendente e, no aceite, criar a participação ativa e atualizar o convite na mesma transação. Manter a conversa disponível.

## Fluxos alternativos

- Recusa de interesse registra a decisão sem disponibilizar conversa.
- Interesse legado já aceito pode receber uma conversa vazia na primeira consulta. Preservar o estado antigo. Histórico e notificações só são registrados a partir de eventos efetivos.
- Recusa de convite mantém o histórico e a situação de moradia. Convites processados deixam de aceitar uma segunda resposta.
- Em tentativa concorrente, reutilizar a negociação existente ou rejeitar resposta incompatível com o estado atual. Uma conta fora da negociação ou diferente da destinatária não obtém acesso pelo identificador do recurso.

## Interface gráfica

- **Meus interesses:** mostra o anúncio, seu estado e o acesso às negociações aceitas.
- **Conversa:** mostra histórico e envio aos dois participantes. O envio de convite fica disponível ao anunciante com papel de gestão.
- **Sino de notificações:** exibe avisos da conta, abre a conversa e oferece ações para convites pendentes. A evolução do aceite na própria conversa e navegação após entrada está descrita na [SPEC-001](../001-anunciar-quarto/requirements.md).

## Componentes sugeridos

| Área                 | Ponto de integração                                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quartos e interesses | [RoomsPage](../../../web/features/rooms/components/RoomsPage.tsx) e [cliente de Quartos](../../../web/features/rooms/api/rooms.api.ts)                                          |
| Negociação           | [RoomNegotiationPage](../../../web/features/rooms/components/RoomNegotiationPage.tsx) e [controller de negociações](../../../backend/src/rooms/room-negotiations.controller.ts) |
| Notificações         | [NotificationBell](../../../web/features/notifications/components/NotificationBell.tsx) e [módulo de notificações](../../../backend/src/notifications/)                         |

## Integração e persistência

| Operação                  | Contrato                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Próprios interesses       | `GET /rooms/negotiations/interests/mine`. Lista somente pedidos da conta autenticada.                                                                         |
| Ler e enviar mensagens    | `GET/POST /rooms/negotiations/:id/messages`. Acesso aos dois participantes. O contrato paginado está na [SPEC-005](../005-paginacao-da-negociacao/design.md). |
| Convidar                  | `POST /rooms/negotiations/:id/invitations`. Valida que o anunciante gere a casa e vincula o convite ao interessado da conversa.                               |
| Responder                 | `PATCH /rooms/negotiations/invitations/:invitationId`. Processa a decisão do destinatário para o convite pendente.                                            |
| Consultar e marcar avisos | `GET /notifications` e `PATCH /notifications/:id/read`. Usam autoria, titularidade e estado para mostrar ações.                                               |

- A [migração de negociações](../../../backend/prisma/migrations/20261115100000_add_room_negotiations/migration.sql) introduz `negociacao_anuncio`, `mensagem_negociacao_anuncio` e a relação de `convite_casa` com a negociação. Preserva registros preexistentes de interesses, mensagens da casa, convites e avisos.
- A conversa é única por `interesse_anuncio`. Estado do interesse, conteúdo da conversa e estado do convite persistem separadamente. Unicidade, transações e atualizações condicionais protegem operações concorrentes.
- Notificações usam `notificacao` e referências de entidade para a conversa ou convite. O desenho original recuperava os avisos na abertura ou atualização do sino. A entrega em tempo real foi tratada separadamente.
- Na implantação, aplicar a migração, disponibilizar as APIs e então integrar a interface. Conferir interesses aceitos antigos e registros novos. Uma reversão deve tratar os dados dependentes antes de retirar as novas relações e preservar interesses, conversas e vínculos anteriores.

## Estados da interface

Mostrar interesses pendentes, aceitos ou recusados. A conversa mantém suas mensagens independentemente do estado do convite. Aceite e recusa exibem o resultado e desativam ações já consumidas. Erros de acesso não revelam conteúdo de terceiros.

## Decisões implementadas

- Aceitar interesse abre a negociação. O convite é a decisão separada que pode efetivar a entrada na casa.
- A negociação fica restrita ao anunciante e ao interessado. O ingresso como morador não amplia o acesso ao histórico.
- O registro de notificação é interno à aplicação. Consulta, convite e resposta conferem a conta autenticada no servidor.

## Rastreabilidade

| Requisitos             | Design                                                  | Critérios |
| ---------------------- | ------------------------------------------------------- | --------- |
| RF01–RF02, RNF02       | Lista de interesses e negociação única por interesse    | CA01–CA02 |
| RF03, RNF01            | Conversa privada por usuário autenticado                | CA03–CA04 |
| RF04–RF05, RNF01–RNF02 | Convite associado ao destinatário e aceite transacional | CA05–CA06 |
| RF06, RNF01            | Registro e ações de notificação por usuário             | CA07–CA09 |
