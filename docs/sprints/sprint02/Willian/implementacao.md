# Sprint 02 — Implementação de Busca e Anúncio de Quartos

**Responsável:** Antonio Willian Silva Oliveira<br>
**Módulo principal:** Busca e gestão de anúncios de quartos<br>
**Requisito relacionado:** RF015 — US013

## 1. Visão geral

A change `add-room-listings` integra a interface Next.js, a API NestJS e PostgreSQL via Prisma para descoberta e publicação de acomodações. A implementação estende o model legado `anuncio_quarto` e preserva `interesse_anuncio`, em vez de criar um segundo modelo/tabela para os mesmos anúncios. A API pública aplica a privacidade no mapper antes de serializar respostas.

A interface segue o shell existente do FullHouse e a referência visual `openspec/Quartos.png`: navegação para Quartos, busca por localização, filtros, chips removíveis, cards, detalhes e fluxos de gestão. Os detalhes de execução dos testes e da migration constam em `testes.md`.

## 2. Frontend

| Arquivo | Responsabilidade |
| --- | --- |
| `web/app/rooms/page.tsx` | Rota de Quartos integrada ao app. |
| `web/features/rooms/components/RoomsPage.tsx` | Busca, filtros, cards, detalhe, publicação/edição, status, interesses e estados de interface. |
| `web/features/rooms/api/rooms.api.ts` | Tipos e chamadas HTTP para busca, detalhe, CRUD, fotos e interesses, usando autenticação da aplicação. |
| `web/components/layout/AppSidebar.tsx` | Acesso “Quartos” na navegação autenticada. |
| `web/features/auth/components/LoginForm.tsx` | Suporte a `returnTo` para retomar o destino após autenticação. |
| `web/features/rooms/**/__test__/` | Testes da API e dos fluxos/componentes de Quartos. |
| `web/components/layout/__test__/AppSidebar.test.tsx` | Teste da navegação atualizada. |

### Fluxos de interface

1. A pessoa abre Quartos pelo menu e consulta anúncios públicos.
2. Busca por cidade/bairro e combina faixa de preço, tipo de moradia e aceita pets; os filtros aplicados podem ser removidos e a consulta é paginada/sincronizada com a URL.
3. Os cards exibem dados retornados pela API, localização aproximada, preço mensal, status, fotos e preferências estruturadas; o detalhe respeita os campos mascarados.
4. A pessoa autenticada com participação ativa pode publicar; o formulário permite configurar separadamente a exibição do endereço e do contato.
5. O anunciante pode consultar seus anúncios, editar, alterar status e remover. Visitantes podem manifestar interesse após autenticar; a tela não revela contato oculto.
6. A UI informa carregamento, falhas recuperáveis, sucesso e lista vazia, com controles rotulados e fluxo responsivo implementado. A verificação manual de teclado/leitor de tela e viewport móvel ainda está pendente.

## 3. Backend e API

| Arquivo/camada | Responsabilidade |
| --- | --- |
| `backend/src/rooms/rooms.module.ts` | Registro e composição do módulo. |
| `backend/src/rooms/rooms.controller.ts` | Rotas REST, JWT nas mutações e extração do usuário autenticado. |
| `backend/src/rooms/rooms.service.ts` | Regras de busca, participação ativa, ownership, transições de status e interesses. |
| `backend/src/rooms/rooms.repository.ts` | Persistência e consultas Prisma, incluindo filtros/paginação. |
| `backend/src/rooms/rooms.mapper.ts` | Conversão para respostas e mascaramento independente de endereço/contato. |
| `backend/src/rooms/dto/` | DTOs de criação, atualização, filtros, resposta e interesse. |
| `backend/src/app.module.ts` | Registro do `RoomsModule`. |
| `backend/src/rooms/README.md` | Referência de contratos, payloads e respostas da API. |
| `backend/test/rooms.e2e-spec.ts` | Cobertura E2E do contrato HTTP e autorização. |
| `backend/test/integration/room-listings-migration.integration.test.ts` | Verificação da migration em schema isolado com registros legados. |

### Endpoints principais

As rotas de busca e detalhe são públicas. Mutação e interesse exigem JWT; operações de gestão validam a participação anunciante. Erros incluem `400` para validação, `401` para sessão ausente/inválida, `403` para falta de ownership/participação e `404` para recurso inexistente. Conflito de interesse duplicado/fechado é tratado sem duplicar registros.

| Método | Rota | Acesso e finalidade |
| --- | --- | --- |
| `GET` | `/rooms/listings` | Público; filtros de localização, preço, status, tipo e aceita pets, com paginação. |
| `GET` | `/rooms/listings/:id` | Público; detalhe com privacidade aplicada. |
| `POST` | `/rooms/listings` | JWT e participação ativa; cria anúncio. |
| `PATCH` | `/rooms/listings/:id` | JWT e ownership; atualiza campos ou status. |
| `DELETE` | `/rooms/listings/:id` | JWT e ownership; fecha/remove sem apagar interesses históricos. |
| `GET` | `/rooms/listings/mine` | JWT; lista gestão do próprio anunciante com seus valores completos para edição. |
| `POST` | `/rooms/listings/photos` | JWT; envia imagem ao storage existente. |
| `POST` | `/rooms/listings/:id/interests` | JWT; manifesta interesse em anúncio aberto. |
| `GET` | `/rooms/listings/:id/interests` | JWT e anunciante; consulta interesses recebidos. |
| `PATCH` | `/rooms/listings/:id/interests/:interestId` | JWT e anunciante; responde ao interesse. |

### Privacidade

O mapper controla os campos privados individualmente em respostas públicas e relacionadas a interesse:

- `exibeEnderecoCompleto=false` implica `enderecoCompleto=null`.
- `exibeContato=false` implica `contato=null`.
- Quando apenas uma flag está ativa, somente o campo correspondente pode ser exibido.
- A rota de gestão própria é a exceção autenticada necessária para editar o anúncio; ela não altera o comportamento de busca/detalhe e não permite que resposta de interesse contorne as flags.

## 4. Persistência e migrações

O Prisma mantém a tabela existente `anuncio_quarto`, com as relações à casa e à participação anunciante, e a tabela existente de interesses. A migration `backend/prisma/migrations/20261109000000_add_room_listing_fields/migration.sql` adiciona os atributos necessários para contato/endereço privado, perfil de convivência, fotos, preferências estruturadas e timestamps, além de índices. O tipo de moradia é estruturado (`QUARTO_INDIVIDUAL`, `VAGA_COMPARTILHADA`, `REPUBLICA`) e status continua usando o enum persistido `ABERTO`/`FECHADO`.

Os valores antigos de anúncio e interesses são preservados; a migration não inventa contato/endereço para registros legados. Foi verificada em schema PostgreSQL isolado com dados legados, incluindo defaults, relação de interesse e rollback. O banco local `fullhouse` já tinha tabelas, mas não tinha histórico `_prisma_migrations`; por isso não foi submetido a reset nem à sequência inteira de migrations. A extensão PostgreSQL `citext` foi habilitada no banco local após o erro inicial de tipo inexistente.

## 5. Dependências e integração

- Backend: NestJS, Prisma, PostgreSQL, JWT, validação de DTO e serviço de storage já existente.
- Frontend: Next.js, React e componentes/cliente HTTP já usados pelo FullHouse.
- As rotas e o fluxo de login reutilizam sessão, layout, navegação e estilos compartilhados existentes.
- Fotos usam o storage existente, limitadas pelo contrato; não são imagens demonstrativas inseridas como anúncios reais.
- Configuração local e comandos de execução/teste manual estão em `testes.md`. Não inclua tokens, cookies ou valores de `.env` em capturas.

## 6. Pontos de acompanhamento

- A validação automatizada cobre interface e API; a compatibilidade visual em viewport móvel, teclado e leitor de tela precisa de conferência manual no navegador.
- O E2E completo teve uma falha fora do módulo, em `test/expenses.e2e-spec.ts`, relacionada a argumento adicional `HOME` esperado/recebido no serviço de despesas. O E2E específico de Quartos passou.
- A migration de Quartos foi testada isoladamente. Não aplicar migrations pendentes indiscriminadamente no banco `fullhouse`, que já tinha dados sem histórico Prisma registrado.
