# SPEC-002 — Design

**Estado:** chat, mural de regras e reuniões implementados no registro original.

## Dependências

- Frontend Next.js com páginas privadas de Chat, Regras e Reuniões e clientes em [house-collaboration/api](../../../web/features/house-collaboration/api/).
- Backend NestJS com autenticação JWT por cookie, proteção de origem para escritas, RxJS e o serviço de acesso à residência.
- Prisma com os modelos `conversa`, `mensagem`, `leitura_conversa`, `regra_convivencia`, `proposta_regra`, `reuniao` e `participante_reuniao`.

## Fluxo principal

1. Resolver a participação ativa pelo usuário autenticado e a residência solicitada.
2. No chat, recuperar ou criar a conversa da casa e consultar o histórico por REST. Abrir o fluxo SSE autenticado com credenciais para receber novas mensagens.
3. No mural, listar as regras vigentes. Ao salvar, registrar criação ou edição com a participação autenticada.
4. Em Reuniões, criar o evento e os convites em transação. Registrar a decisão apenas do convidado ativo. Identificar o organizador antes de reagendar ou cancelar.

## Fluxos alternativos

- Se a conexão de chat cair, consultar o histórico posterior ao último ID recebido e reabrir o fluxo. Limpar a associação ao canal na desconexão.
- Se a participação terminar, encerrar a conexão e impedir a entrega posterior. O [registro de testes da Sprint 02](../../../docs/sprints/sprint02/Iago/colaboracao-casa/testes.md) documenta verificação de revogação em intervalos de 15 segundos.
- Se duas requisições tentarem criar a conversa da casa, recuperar a conversa já criada após a violação de unicidade.
- Se houver conversas `CASA` duplicadas antes da migração, interromper com diagnóstico e preservar o histórico para correção explícita.
- Se algum participante sair da casa após receber um convite, preservar suas respostas históricas e exigir vínculo ativo nas operações futuras.

## Interface gráfica

- **Chat:** histórico cronológico, autoria, data e horário, campo de envio e estado de conexão. Trocas de contexto residencial devem trocar também o histórico e o canal ativo.
- **Regras:** mural de regras vigentes, formulário de título e descrição, data de cadastro, criador e último editor.
- **Reuniões:** formulário de data, horário e pauta, lista de reuniões com situação e respostas dos convidados. Ações de reagendamento e cancelamento aparecem para o organizador da reunião agendada.

## Componentes sugeridos

| Área     | Ponto de integração                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------- |
| Chat     | Módulo [chat](../../../backend/src/chat/) e [página privada](../../../web/app/%28private%29/chat/page.tsx)                |
| Regras   | Módulo [house-rules](../../../backend/src/house-rules/) e [página privada](../../../web/app/%28private%29/rules/page.tsx) |
| Reuniões | Módulo [meetings](../../../backend/src/meetings/) e [página privada](../../../web/app/%28private%29/meetings/page.tsx)    |

## Integração e persistência

| API sob `/residences/:residenceId`                                                                | Contrato                                                                                               |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `GET /chat`, `GET /chat/messages`, `POST /chat/messages`                                          | Conversa da casa, histórico e envio. O autor vem da sessão e a mensagem é transmitida após a gravação. |
| `GET /chat/stream` (SSE)                                                                          | Canal autenticado por conversa, com o ID da mensagem persistida como identificador do evento.          |
| `GET /rules`, `POST /rules`, `PATCH /rules/:ruleId`                                               | Consulta, criação e edição de regras vigentes e autoria na mesma escrita.                              |
| `GET /meetings`, `POST /meetings`, `PATCH /meetings/:meetingId/respond`, `/reschedule`, `/cancel` | Consulta, criação, resposta e ações do organizador.                                                    |

- A [migração da conversa única](../../../backend/prisma/migrations/20261115000000_unique_house_conversation/migration.sql) cria um índice único parcial no PostgreSQL para `tipo = CASA` por residência. Subgrupos mantêm a modelagem própria. Na reversão, retirar apenas o índice, preservando mensagens e conversas.
- Regras usam `escopo = CASA`, `status = VIGENTE`, as colunas de criador e último editor e o valor padrão de `criado_em`. A edição atualiza o conteúdo e o editor na mesma escrita. Versionamento para edições concorrentes fica para uma evolução futura.
- Reuniões gravam `pauta`, derivam o título dos primeiros 150 caracteres e usam data e horário ISO 8601 com deslocamento de fuso, persistidos em `timestamptz`. Respostas registram `respondido_em`. Reagendamento mantém a relação `reagendada_de_id` e cria substituta com convites na mesma transação.

## Estados da interface

Tratar histórico vazio, carregamento, invalidação por perda de acesso, desconexão e reconexão no chat. No mural e em reuniões, distinguir dados vazios, erro de consulta, validação de formulário e estado persistido. As APIs mantêm os contratos de autenticação, acesso negado e recurso inexistente.

## Decisões implementadas

- REST recebe envios e consultas. SSE distribui os eventos já persistidos dentro do processo de backend. Escalar o backend exigiria um intermediário compartilhado.
- Chat, regras e reuniões usam módulos separados e reutilizam o serviço de acesso à casa. Regras e reuniões reaproveitam o schema existente.
- Na implantação, conferir duplicatas do chat e aplicar a migração aditiva antes de disponibilizar os clientes. A decisão de corrigir duplicatas é explícita e preserva o histórico.

## Rastreabilidade

| Requisitos             | Design                                                              | Critérios |
| ---------------------- | ------------------------------------------------------------------- | --------- |
| RF01–RF03, RNF01–RNF02 | REST, SSE, histórico, índice parcial e controles por residência     | CA01–CA03 |
| RF04–RF05, RNF01       | Mural vigente, autoria e edição no escopo da casa                   | CA04–CA05 |
| RF06–RF08, RNF01–RNF02 | Convites transacionais, resposta autorizada e histórico de reuniões | CA06–CA09 |
