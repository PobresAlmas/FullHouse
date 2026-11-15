# Tasks — Busca e Anúncio de Quartos Disponíveis

Marcar `[x]` somente após implementação e verificação. Esta change especifica backend e frontend completos.

## 1. Inspeção e contrato

- [x] 1.1 Conferir RF015/US013 nos documentos e confirmar semântica dos campos do modelo legado `anuncio_quarto`.
- [x] 1.2 Revisar autenticação JWT, participação ativa, padrão de módulos NestJS, serialização, paginação e rotas frontend existentes.
- [x] 1.3 Definir taxonomia persistida para tipo de moradia, fotos, aceita pets e regras de convivência antes de habilitar os filtros da referência visual.
- [x] 1.4 Fechar política de backfill para contato e endereço legados sem inventar dados.

## 2. Banco de dados e Prisma

- [x] 2.1 Evoluir `anuncio_quarto` e campos/enum existentes em `backend/prisma/schema.prisma`, sem criar tabela duplicada.
- [x] 2.2 Adicionar relações inversas e índices de cidade, bairro, status, valor e data necessários às consultas.
- [x] 2.3 Criar migration compatível com dados atuais, FKs e `interesse_anuncio`; tratar duplicatas antes de constraints.
- [x] 2.4 Gerar Prisma Client, validar schema e executar a migration num schema isolado do PostgreSQL de desenvolvimento.

## 3. DTOs e validações

- [x] 3.1 Criar DTO de criação com validações de título, descrição, preço, localização, contato, flags e campos estruturados.
- [x] 3.2 Criar DTO parcial de atualização sem permitir alterar anunciante/casa.
- [x] 3.3 Criar query DTO para filtros, status, paginação, conversão de tipos, limites e intervalos.
- [x] 3.4 Criar DTOs de resposta/listagem, interesse e resposta de interesse.

## 4. Repositório e serviço

- [x] 4.1 Implementar repository para criação, busca paginada, detalhe, ownership, update e remoção lógica.
- [x] 4.2 Implementar service para filtros cumulativos, estado padrão, ownership e participação ativa.
- [x] 4.3 Implementar criação/consulta/decisão de interesse usando o model existente e evitando duplicidade.
- [x] 4.4 Garantir que anúncio removido/fechado não apareça na busca pública e que interesses históricos permaneçam.

## 5. Mapper, controller e API

- [x] 5.1 Implementar mapper Prisma → resposta, mascarando independentemente endereço e contato conforme as flags.
- [x] 5.2 Implementar `POST`, `GET` coleção, `GET :id`, `PATCH :id` e `DELETE :id` em `/rooms/listings`.
- [x] 5.3 Proteger mutações com `JwtAuthGuard`; validar participação ativa na criação e ownership nas alterações.
- [x] 5.4 Implementar rotas de interesse autenticadas e limitar consulta/decisão ao anunciante.
- [x] 5.5 Documentar respostas HTTP, paginação, erros e exemplos no mecanismo de documentação da API existente.

## 6. Frontend completo

- [x] 6.1 Adicionar acesso “Quartos” à navegação autenticada e configurar rota integrada ao shell/layout existente.
- [x] 6.2 Criar cliente/serviços tipados para busca, detalhe, CRUD, paginação e interesses, usando JWT pelo fluxo já existente.
- [x] 6.3 Implementar busca por cidade/bairro, preço mínimo/máximo, abas/categorias e filtros avançados somente para campos estruturados persistidos.
- [x] 6.4 Implementar chips removíveis de filtros, contagem/resultados, paginação e sincronização com URL.
- [x] 6.5 Implementar cards e detalhe responsivos conforme `openspec/Quartos.png`, com status, preço mensal, localização aproximada e preferências.
- [x] 6.6 Implementar formulário de publicação/edição, gestão de status e remoção, com feedback de validação e explicação das flags de privacidade.
- [x] 6.7 Implementar ação autenticada para manifestar interesse e estados de acesso/login sem expor contato oculto.
- [x] 6.8 Implementar estados de carregamento, erro recuperável, vazio e sucesso; assegurar teclado, foco e labels acessíveis.
- [x] 6.9 Integrar dados reais de imagens/fotos conforme modelo final; não usar texto de demonstração como anúncio real.

## 7. Testes automatizados

- [x] 7.1 Vitest unitários do service: filtros, paginação, defaults, estado e autorização/ownership.
- [x] 7.2 Vitest unitários do mapper: combinações independentes das flags, incluindo ausência de vazamento.
- [x] 7.3 Vitest unitários de DTOs/validações e interesses duplicados.
- [x] 7.4 E2E NestJS: CRUD, JWT, participação ativa, ownership, status e códigos HTTP.
- [x] 7.5 E2E: busca pública, filtros cumulativos, limites de paginação e formato de metadados.
- [x] 7.6 E2E: privacidade em coleção, detalhe e interesse com as quatro combinações de flags.
- [x] 7.7 Testes frontend: busca/filtros, formulário, detalhe, estados vazio/erro, mascaramento e interesse.
- [ ] 7.8 Validar layout desktop/móvel, teclado e leitor de tela nos fluxos essenciais.

## 8. Integração e entrega

- [x] 8.1 Confirmar integração com padrões de navegação, sessão, residência ativa e design system existentes.
- [x] 8.2 Revisar se todos filtros exibidos têm representação persistida e se não há dados fictícios.
- [x] 8.3 Verificar migration com dados legados, rollback e preservação de interesses.
- [x] 8.4 Revisar requisitos e cenários desta change após implementação; executar verificações definidas pelo projeto.

## Resultado da validação

- O schema Prisma foi validado e o Prisma Client gerado. `citext` foi habilitada no banco local para corrigir o erro ocorrido ao tentar sincronizar o schema.
- A migration foi executada num schema PostgreSQL isolado com anúncio e interesse legados; campos antigos e registros de interesse permaneceram intactos, os novos defaults foram conferidos e a transação de teste sofreu rollback.
- A base `fullhouse` já contém tabelas sem histórico `_prisma_migrations`; não apliquei a sequência inteira de migrations nem forcei reset nesse banco.
- Testes unitários backend: 278 passaram. Testes frontend: 178 passaram. E2E específico de quartos: 6 passaram. E2E completo: 49 passaram e um teste preexistente de despesas falhou (`test/expenses.e2e-spec.ts`, argumento adicional `HOME` em `findAll`).
- Builds NestJS e Next.js e `openspec validate add-room-listings --strict` passaram.
- QA visual em viewport estreita e com leitor de tela continua pendente (7.8), pois este ambiente não tem navegador instalado.
