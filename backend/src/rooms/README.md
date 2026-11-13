# Room listings HTTP API

Base path: `/rooms/listings`. IDs are UUID v4. Unauthenticated routes are `GET /` and `GET /:id`; all writes and owner routes use the existing JWT cookie guard.

| Method and path                                   | Access                                 | Success                                                               |
| ------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------- |
| `GET /rooms/listings`                             | Public                                 | `200 { data, meta }`                                                  |
| `GET /rooms/listings/:id`                         | Public                                 | `200 RoomListingResponseDto`                                          |
| `GET /rooms/listings/mine?casaId=...`             | JWT                                    | `200 RoomListingResponseDto[]`; owner values are included for editing |
| `POST /rooms/listings`                            | JWT + active participation in `casaId` | `201 RoomListingResponseDto`                                          |
| `PATCH /rooms/listings/:id`                       | JWT + active creator participation     | `200 RoomListingResponseDto`                                          |
| `DELETE /rooms/listings/:id`                      | JWT + active creator participation     | `204`; closes the listing and preserves interests                     |
| `POST /rooms/listings/photos?casaId=...`          | JWT + active participation             | `201 { url }`; JPEG/PNG/WebP, up to 8 MiB                             |
| `POST /rooms/listings/:id/interests`              | JWT                                    | `201 { id, anuncioId, status }`                                       |
| `GET /rooms/listings/:id/interests`               | JWT + active creator participation     | `200 Interest[]`                                                      |
| `PATCH /rooms/listings/:id/interests/:interestId` | JWT + active creator participation     | `200 { id, anuncioId, status }`                                       |

Search accepts `cidade`, `bairro`, `precoMin`, `precoMax`, `status`, `tipoMoradia`, `aceitaPets`, `page` and `limit`. Defaults are `ABERTO`, page 1 and 10 results; maximum page size is 50. Location matching is case-insensitive and partial. Price bounds are inclusive. Default ordering is newest first.

Creation body requires `casaId`, `titulo` (max 150), `preco` (> 0, max 2 decimals), `cidade` (max 100) and `contato` (3–100 chars). Optional fields: `descricao`, `bairro`, `enderecoCompleto`, `exibeEnderecoCompleto`, `exibeContato`, `perfilConvivencia`, `tipoMoradia`, `aceitaPets`, and up to eight `fotos` URLs. `PATCH` accepts a partial creation body except `casaId` and adds `status` (`ABERTO` or `FECHADO`). Interest status can be changed only to `ACEITO` or `RECUSADO`. Interest creation serializes on the listing row and checks for a pending interest in the same transaction, avoiding duplicates without rewriting legacy history.

Public collection/detail responses always include `enderecoCompleto` and `contato` as either values or `null`; each value is disclosed only when its corresponding flag is true. Owner-only `/mine` returns the creator's saved values to support editing. Validation errors return `400`, unauthenticated mutations `401`, non-owner writes `403`, missing/closed public detail `404`, and duplicate interest `409`.
