---
id: add-room-listings
title: "RF015: Busca e Anúncio de Quartos Disponíveis"
status: PROPOSED
created_at: 2026-11-09
authors:
  - Antônio Willian Silva Oliveira
tags:
  - RF015
  - US013
  - rooms
references:
  - RF015
  - US013
---

# Change: Busca e Anúncio de Quartos Disponíveis

## 1. Overview & Context

Esta mudança entrega o fluxo completo de anúncios de quartos: moradores publicam e gerenciam vagas em suas casas; pessoas que procuram moradia descobrem anúncios por cidade, bairro e preço, consultam detalhes e demonstram interesse. O fluxo deve integrar autenticação, residência e identidade existentes do FullHouse, sem expor endereço ou contato quando o anunciante optou por ocultá-los.

O schema atual já possui `anuncio_quarto`, `interesse_anuncio`, `status_anuncio_enum` e relações com `casa` e `participacao`. Portanto, esta mudança especifica a evolução compatível desses modelos e a migration necessária, sem criar uma segunda tabela paralela chamada `QuartoAnuncio`. O nome conceitual `QuartoAnuncio` corresponde ao model físico existente `anuncio_quarto`.

### Escopo

- API NestJS para criar, buscar, detalhar, editar, fechar/reabrir e excluir anúncios em `/rooms/listings`.
- Evolução Prisma/PostgreSQL do anúncio existente para preço, bairro, endereço, contato, preferências de privacidade e perfil de convivência, preservando dados e interesses legados.
- Busca pública paginada, autorização por participação ativa da casa para mutações e mascaramento de dados privados no servidor.
- Interface web completa integrada à navegação e ao design system atual: busca, filtros, cartões, detalhe, interesse, formulário e gestão dos próprios anúncios.
- Testes automatizados unitários e E2E backend, além de testes de componentes/fluxos frontend conforme ferramentas existentes.

### Referências

- Requisito de produto: `docs/req.pdf` (RF015 / US013).
- Diagrama de classes: `docs/class-diagram/pdf/diagrama_de_classes.pdf` e `docs/class-diagram/explanation/explicacao_diagrama_classes.md`.
- Referência visual de busca: `openspec/Quartos.png`.

## 2. Capabilities

### New

- `room-listings`: publicação, busca, visualização, interesse e gestão de anúncios de quartos.
- `room-listings-frontend`: experiência web completa de descoberta e gestão de anúncios.

### Modified

- Persistência de `anuncio_quarto` e suas relações existentes; manter compatibilidade com `interesse_anuncio`.
- Navegação e layout autenticados para oferecer acesso à busca de quartos e à gestão dos anúncios do usuário.

## 3. Spec Deltas

Ver `specs/room-listings/spec.md` para requisitos funcionais, não funcionais e cenários de aceitação em formato Given/When/Then.

## 4. Fora de escopo

- Pagamento, reserva contratual, assinatura ou garantia de disponibilidade da vaga.
- Chat em tempo real, envio de documentos ou publicação de telefone em canais externos.
- Criar uma segunda entidade de anúncio quando o model existente pode ser evoluído.
- Redesenhar áreas não relacionadas do sistema.

## 5. Impacto

- **Backend:** módulo NestJS de rooms, DTOs, guards, controller, service, repository e mapper; Prisma schema e migration.
- **Frontend:** telas/componentes e chamadas de API para descoberta, detalhes, filtros, interesse e gestão de anúncios; integração com autenticação, rotas e navegação existentes.
- **Dados:** migration aditiva/compatível para complementar `anuncio_quarto`; índices para consulta e relações inversas Prisma se necessários.
- **Segurança:** a autorização e o mascaramento ocorrem no servidor; ocultar campos somente na UI não satisfaz este requisito.
