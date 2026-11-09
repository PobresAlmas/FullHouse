# Sprint 02 — Requisitos implementados: Busca e Anúncio de Quartos

**Responsável:** Antonio Willian Silva Oliveira<br>
**Módulo:** Busca, publicação e gestão de anúncios de quartos<br>
**Requisito relacionado:** RF015 — US013

## 1. História de usuário — US013

**Cartão**

Como pessoa que procura moradia compartilhada, quero encontrar quartos e vagas disponíveis por localização, preço e características, para comparar opções e manifestar interesse. Como morador anunciante, quero publicar e gerir meu anúncio com controle sobre a divulgação do endereço e do contato.

**Conversa**

A funcionalidade integra descoberta pública de anúncios com publicação e gestão autenticadas. A busca oferece filtros cumulativos e paginação; o anunciante pode manter fotos, tipo de moradia, preferências e regras de convivência. O interesse usa o modelo já existente no domínio. Endereço completo e contato são protegidos individualmente no servidor pelas respectivas flags de exibição.

**Confirmação — critérios de aceitação**

- Qualquer visitante pode buscar e consultar anúncios públicos disponíveis, com filtros de cidade, bairro, preço, tipo de moradia e aceita pets quando aplicável, e paginação.
- Uma pessoa autenticada com participação ativa na casa pode publicar anúncio. O sistema identifica o anunciante pela sessão e participação, não por ID fornecido pelo cliente.
- O anúncio novo começa aberto; somente o anunciante pode editá-lo, fechar/reabrir ou removê-lo.
- A busca usa filtros cumulativos, correspondência parcial sem distinção entre maiúsculas/minúsculas para cidade/bairro, faixa de preço inclusiva e ordenação determinística por data mais recente.
- A API mascara `enderecoCompleto` para `null` sempre que `exibeEnderecoCompleto=false` e mascara `contato` para `null` sempre que `exibeContato=false`. As flags são independentes e a regra vale em listas, detalhes e respostas públicas relacionadas a interesse.
- O anunciante pode consultar seus próprios anúncios pela rota de gestão, inclusive os valores privados necessários para edição.
- Usuários autenticados podem manifestar interesse em anúncio aberto; o mesmo usuário não cria interesses pendentes duplicados. O anunciante pode consultar e responder aos interesses dos próprios anúncios.
- Fechar/remover anúncio o retira da busca pública e preserva os interesses e seu histórico.
- A interface web integrada permite descobrir, filtrar, ver detalhes, publicar, editar, gerir status, manifestar interesse e acompanhar estados de carregamento, erro e ausência de resultados.
- Filtros visuais refletem atributos estruturados persistidos; a interface não infere características a partir de texto livre nem apresenta anúncios fictícios como dados reais.
- Campos, filtros, paginação, autenticação e autorização inválidos são rejeitados sem persistir alterações.

## 2. Privacidade e autorização

| Campo/ação | Regra |
| --- | --- |
| `enderecoCompleto` em respostas públicas | Retorna `null` se `exibeEnderecoCompleto` for `false`. |
| `contato` em respostas públicas | Retorna `null` se `exibeContato` for `false`. |
| Flags de privacidade | Independentes: habilitar uma não revela o outro campo. |
| Gestão própria (`/rooms/listings/mine`) | Anunciante autenticado recebe os próprios valores para poder editar; a exceção não se aplica à busca ou detalhe público. |
| Criar anúncio | Exige JWT e participação ativa na casa indicada. |
| Editar, fechar, reabrir ou remover | Exige JWT e ownership pela participação anunciante; terceiros recebem `403` (recurso inexistente pode retornar `404`). |
| Buscar e consultar detalhe | Público; somente anúncios em estado público/disponível aparecem na busca padrão. |
| Manifestar interesse | Exige JWT e anúncio aberto; interesse não contorna as flags de privacidade. |

## 3. Modelo de domínio

O modelo conceitual é `QuartoAnuncio`; o projeto já possuía `anuncio_quarto`, portanto a implementação evolui esse model e sua tabela, preservando os dados e relações existentes, sem criar tabela duplicada.

### Anúncio de quarto (`anuncio_quarto`)

| Campo/atributo | Regra e finalidade |
| --- | --- |
| `id` | UUID do anúncio. |
| `titulo` | Obrigatório, até 150 caracteres. |
| `descricao` | Texto descritivo, opcional. |
| `preco` / `valor_mensal` | Valor mensal positivo, decimal (10,2). |
| `cidade`, `bairro` | Localização aproximada; cidade obrigatória e bairro opcional. |
| `enderecoCompleto` | Endereço exato opcional, separado da referência legada. |
| `exibeEnderecoCompleto` | Controla exclusivamente a divulgação do endereço exato; default `false`. |
| `contato` | Contato do anunciante, obrigatório para novo cadastro; anúncios legados podem permanecer sem valor até atualização. |
| `exibeContato` | Controla exclusivamente a divulgação do contato; default `false`. |
| `perfilConvivencia` | Texto com regras/perfil da convivência. |
| `tipoMoradia` | Enum: `QUARTO_INDIVIDUAL`, `VAGA_COMPARTILHADA`, `REPUBLICA`. |
| `aceitaPets` | Boolean estruturado; default `false`. |
| `fotos` | Lista de URLs; máximo de oito imagens aceitas pelo fluxo. |
| `status` | Enum existente `ABERTO` / `FECHADO`; novos anúncios iniciam `ABERTO`. |
| `casaId`, `criadoPorParticipacaoId` | Relações existentes com casa e participação anunciante, mantidas. |
| `criadoEm`, `atualizadoEm` | Timestamps de criação e atualização. |

### Interesse em anúncio (`interesse_anuncio`)

Mantém o registro ligado ao anúncio e ao usuário interessado, incluindo mensagem e estado de interesse. A mudança usa essa estrutura existente, evita duplicidade de interesse pendente e preserva registros históricos quando o anúncio é fechado/removido.

## 4. Rastreabilidade

| Entrega | Critério | Evidência no repositório |
| --- | --- | --- |
| Busca pública, filtros e paginação | RF015 / US013 | `GET /rooms/listings`, DTO de consulta, service e repository do módulo `backend/src/rooms`. |
| Cadastro, edição e remoção | RF015 / US013 | `POST`, `PATCH` e `DELETE /rooms/listings`; JWT e validação de participação/ownership. |
| Privacidade por campo | RF015 / US013 | Mapper de anúncios e testes unitários das combinações das flags. |
| Interesse | RF015 / US013 | Rotas `/rooms/listings/:id/interests` e integração ao model existente. |
| Persistência/migração | RF015 / US013 | `backend/prisma/schema.prisma` e migration incremental de campos do anúncio. |
| Interface web | RF015 / US013 | `web/app/rooms/page.tsx`, `web/features/rooms/` e navegação compartilhada. |
| Testes e limitações observadas | Ver `testes.md` | Vitest backend/frontend, E2E, integração PostgreSQL e roteiro manual. |
