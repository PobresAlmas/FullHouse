# Room listings HTTP API

Base path: `/rooms/listings`. IDs are UUID v4. Unauthenticated routes are `GET /` and `GET /:id`; all writes and owner routes use the existing JWT cookie guard.

| Method and path                                            | Access                                                  | Success                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| `GET /rooms/listings`                                      | Public; authenticated users without an active residence | `200 { data, meta }`; active residents receive `403`                  |
| `GET /rooms/listings/:id`                                  | Public                                                  | `200 RoomListingResponseDto`                                          |
| `GET /rooms/listings/mine?casaId=...`                      | JWT                                                     | `200 RoomListingResponseDto[]`; owner values are included for editing |
| `POST /rooms/listings`                                     | JWT + active participation in `casaId`                  | `201 RoomListingResponseDto`                                          |
| `PATCH /rooms/listings/:id`                                | JWT + active creator participation                      | `200 RoomListingResponseDto`                                          |
| `DELETE /rooms/listings/:id`                               | JWT + active creator participation                      | `204`; closes the listing and preserves interests                     |
| `POST /rooms/listings/photos?casaId=...`                   | JWT + active participation                              | `201 { url }`; JPEG/PNG/WebP, up to 8 MiB                             |
| `POST /rooms/listings/:id/interests`                       | JWT                                                     | `201 { id, anuncioId, status }`                                       |
| `GET /rooms/listings/:id/interests`                        | JWT + active creator participation                      | `200 Interest[]`                                                      |
| `PATCH /rooms/listings/:id/interests/:interestId`          | JWT + active creator participation                      | `200 { id, anuncioId, status, negotiationId }`                        |
| `GET /rooms/negotiations/interests/mine`                   | JWT                                                     | `200 MyRoomInterest[]`                                                |
| `GET /rooms/negotiations/:id/messages?limit=30&before=...` | JWT + negotiation participant                           | `200 NegotiationMessagesPage`                                         |
| `POST /rooms/negotiations/:id/messages`                    | JWT + negotiation participant                           | `201 NegotiationMessage`                                              |
| `POST /rooms/negotiations/:id/invitations`                 | JWT + advertiser who manages the house                  | `201 RoomInvitation`                                                  |
| `PATCH /rooms/negotiations/invitations/:id`                | JWT + addressed invitee                                 | `200 InvitationDecision`                                              |

Search accepts `cidade`, `bairro`, `precoMin`, `precoMax`, `status`, `tipoMoradia`, `aceitaPets`, `page` and `limit`. Defaults are `ABERTO`, page 1 and 10 results; maximum page size is 50. Location matching is case-insensitive and partial. Price bounds are inclusive. Default ordering is newest first.

Creation body requires `casaId`, `titulo` (max 150), `preco` (> 0, max 2 decimals), `cidade` (max 100) and `contato` (3–100 chars). Optional fields: `descricao`, `bairro`, `enderecoCompleto`, `exibeEnderecoCompleto`, `exibeContato`, `perfilConvivencia`, `tipoMoradia`, `aceitaPets`, and up to eight `fotos` URLs. `PATCH` accepts a partial creation body except `casaId` and adds `status` (`ABERTO` or `FECHADO`). Interest status can be changed only to `ACEITO` or `RECUSADO`. Interest creation serializes on the listing row and rejects a second submission while an interest is pending or accepted. After a refusal, a new attempt reopens that interest record as `PENDENTE` instead of creating a duplicate. Accepting a pending interest atomically creates or reuses its private negotiation and persists a notification; declining does not create a negotiation.

`GET /rooms/negotiations/interests/mine` returns the authenticated user's interests only:

```json
[
    {
        "id": "interest-uuid",
        "status": "ACEITO",
        "mensagem": "Tenho interesse no quarto.",
        "negotiationId": "negotiation-uuid",
        "anuncio": { "id": "listing-uuid", "titulo": "Quarto individual" }
    }
]
```

`negotiationId` is `null` until an interest is accepted. For legacy accepted interests, the API creates an empty negotiation on first inbox read. The listing uses the existing public response rules for address and contact. `GET /rooms/negotiations/:id/messages` accepts optional `limit` (default 30, maximum 50) and `before` (UUID of the oldest message in the current page) query parameters. It returns `{ id, interestId, status, anuncio, mensagens, hasMore, nextCursor }`; `mensagens` is chronological, `hasMore` indicates whether older messages remain, and `nextCursor` is the oldest returned message ID when another page exists (otherwise `null`). Use that cursor as `before` to fetch the next older page. Ordering uses message timestamp and ID to keep page boundaries stable. Each message has `id`, `autorId`, `autorNome`, `autorFotoUrl`, `conteudo` and `enviadaEm`. Send a message with `{ "conteudo": "Olá" }` (1–2000 characters). Reads and writes are limited to the exact interested user and listing advertiser; unrelated users receive `404`. Invalid limits, malformed cursors, or cursors from another negotiation are rejected with `400`. Messages and their recipient notifications are persisted in the same transaction. These endpoints do not use polling or real-time transport.

An advertiser who is also a house leader/administrator sends an invitation with `POST /rooms/negotiations/:id/invitations`; the server binds it to the conversation's interested user and expires it after seven days. A repeated send while that invitation is still pending returns the existing invitation. The addressed user responds with `{ "status": "ACEITO" }` or `{ "status": "RECUSADO" }` at `PATCH /rooms/negotiations/invitations/:id`. Accepting creates an active `MORADOR` participation and updates the invitation in one transaction. Declining changes no membership and does not close the negotiation. Responses are recipient-only; stale invitations are marked `EXPIRADO`.

The authenticated `GET /notifications` endpoint returns the current user's most recent 50 notifications, including `id`, `titulo`, `mensagem`, `lida`, `criadoEm`, `entidadeTipo`, `entidadeId`, `negotiationId` and optional `convite: { id, status, expiraEm, podeResponder }`. Only notifications addressed to the session user are returned, and a pending invitation action is shown only to its addressed recipient while unexpired. `PATCH /notifications/:id/read` marks one of that user's notifications read and returns `{ "id": "...", "lida": true }`; another user's notification is reported as not found. The bell loads persisted data on demand; no real-time delivery is used.

The listing search is available to anonymous visitors and authenticated users without an active residence. Authenticated users with an active residence receive `403` from `GET /rooms/listings`; they can still use `/mine` to manage their own listings. Public detail remains available. Public collection/detail responses always include `enderecoCompleto` and `contato` as either values or `null`; each value is disclosed only when its corresponding flag is true. Owner-only `/mine` returns the creator's saved values to support editing. Validation errors return `400`, unauthenticated mutations `401`, non-owner writes `403`, missing/closed public detail `404`, and duplicate interest `409`.

`GET /rooms/listings/house?casaId=<uuid>` requires a JWT and active membership in the requested residence. It returns the house's open and closed listings with `autorNome`, `canManage` and `pendingInterestCount`. Only the active listing author receives unmasked fields and a pending count. The other members receive the public fields and a null count. Editing and responding to interests use the existing owner checks.

Creating or reopening an interest stores a notification for the author in the same transaction. It has `entidade_tipo = INTERESSE_QUARTO` with the listing ID in `entidade_id`. A duplicate pending or accepted interest returns `409` without creating another notification.
