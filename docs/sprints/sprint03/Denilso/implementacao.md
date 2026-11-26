# Sprint 03 — Implementação de Anunciar quarto

**Responsável:** Denilso<br>
**Módulo principal:** Quartos — publicação e gestão de anúncios em Moradores<br>
**OpenSpec:** [Design da SPEC-001](../../../../openspec02/spec/001-anunciar-quarto/design.md)

## 1. Visão geral

A aba Moradores oferece publicação, consulta e edição de anúncios da casa. O formulário usa a residência exibida, consulta as regras vigentes e envia fotos para o armazenamento. A publicação reaproveita a busca de Quartos e o fluxo de negociação para dar sequência aos interesses e convites.

## 2. Frontend

| Componente                                                                                                                                                | Responsabilidade                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [SettingsPage](../../../../web/features/settings/components/SettingsPage.tsx)                                                                             | Exibe **Anunciar quarto** em Moradores para gestores da casa ativa, controla a abertura do formulário e confirma a publicação.                                          |
| [RoomListingDialog](../../../../web/features/rooms/components/RoomListingDialog.tsx)                                                                      | Identifica a casa, valida os campos, revisa as regras de convivência e trata seleção, envio e reaproveitamento das fotos em uma nova tentativa.                         |
| [HouseRoomListings](../../../../web/features/rooms/components/HouseRoomListings.tsx)                                                                      | Exibe **Anúncios da casa**, abre a prévia e o formulário de edição. Para o anunciante, oferece a lista de interessados e o acesso à conversa após aceitar um interesse. |
| [Link de interesse](../../../../web/features/notifications/room-interest-link.ts) e [cliente de Quartos](../../../../web/features/rooms/api/rooms.api.ts) | Abrem o anúncio em Moradores a partir do aviso e enviam as ações autenticadas à API.                                                                                    |
| [Entrada na residência](../../../../web/features/rooms/enter-invited-residence.ts)                                                                        | Após aceite confirmado do convite, informa a mudança de vínculo à interface, atualiza o perfil e abre a Home. É usado pelo sino e pela conversa.                        |

## 3. Backend

| Operação                      | Contrato                                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| Ler as regras da casa         | `GET /residences/:residenceId/rules`.                                                          |
| Enviar foto                   | `POST /rooms/listings/photos?casaId=<id>`, com o campo multipart `file`.                       |
| Publicar, listar e editar     | `POST /rooms/listings`, `GET /rooms/listings/house?casaId=<id>` e `PATCH /rooms/listings/:id`. |
| Registrar e decidir interesse | `POST/GET /rooms/listings/:id/interests` e `PATCH /rooms/listings/:id/interests/:interestId`.  |
| Responder ao convite          | `PATCH /rooms/negotiations/invitations/:invitationId`, reaproveitado da negociação.            |

O [serviço de Quartos](../../../../backend/src/rooms/rooms.service.ts) valida a residência ativa, o papel de gestão para publicar ou enviar fotos e a autoria ao editar ou responder a um interesse. O [serviço de armazenamento](../../../../backend/src/storage/storage.service.ts) atende o upload de fotos do anúncio.

## 4. Regras de persistência e validação

- `anuncio_quarto` guarda a casa, a participação autora, as fotos, o texto confirmado de convivência e a opção de pets. A resposta pública aplica separadamente as flags de endereço e contato.
- O [repositório de Quartos](../../../../backend/src/rooms/rooms.repository.ts) registra o interesse e a notificação do anunciante em transação. O aceite do interesse abre a negociação. O aceite do convite pelo destinatário registra a participação e a situação de moradia.
- A foto pode ser consultada sem login. A política de leitura pública é aplicada ao prefixo das fotos de anúncios.
- A conversa e o convite da SPEC-004 e a paginação da SPEC-005 são integrações da entrega. A publicação e sua gestão em Moradores ficam na SPEC-001.

## 5. Rastreabilidade

- [Requisitos](requisitos.md), [testes](testes.md) e [tarefas da SPEC-001](../../../../openspec02/spec/001-anunciar-quarto/tasks.md).
- [Abertura do anúncio em Moradores](../../../../openspec02/spec/001-anunciar-quarto/evidencias/01-moradores-desktop.png) e [confirmação da publicação](../../../../openspec02/spec/001-anunciar-quarto/evidencias/03-publicado.png).
- [Implementação da SPEC-006](contextos-home-tarefas/implementacao.md) para Home e Tarefas.
