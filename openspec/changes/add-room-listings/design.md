# Design — Busca e Anúncio de Quartos

## Contexto

O schema PostgreSQL/Prisma já contém `anuncio_quarto` ligado a `casa` e `participacao`, com campos de título, valor mensal, cidade, bairro, status e flags de exibição. Também existem `interesse_anuncio` e seus estados. O domínio do projeto usa nomes físicos em português snake_case e enums em minúsculas. A implementação deve evoluir esse modelo existente e mapear para nomes de DTO legíveis, evitando entidades duplicadas e preservando registros existentes.

A referência `openspec/Quartos.png` mostra a área principal com contexto pessoal/residência, abas “Todos os Quartos”, “Repúblicas” e “Aceita Pets”, busca por localização, preço, regras da casa e filtros avançados; chips dos filtros aplicados; cards com status, foto, título, localidade, preço, preferências e botão de detalhe. O layout deve se integrar ao shell FullHouse e responder a telas estreitas.

## Decisões

### D1 — Evoluir o modelo existente

`QuartoAnuncio` é o nome conceitual; o model Prisma existente `anuncio_quarto` e sua tabela física permanecem como fonte única. Adicionar os campos necessários em migration compatível. Campos antigos `valor_mensal`, `exibir_endereco`, `endereco_referencia`, `casa_id`, `criado_por_participacao_id` e `status` são mantidos ou migrados explicitamente, não descartados sem tratamento. O contrato `preco` mapeia para `valor_mensal`, `exibeEnderecoCompleto` para a flag existente e `enderecoCompleto` para endereço persistido.

O anunciante é uma participação, não um usuário solto: serve para autorizar alterações e confirmar vínculo à casa. Para respostas de interesse, `interesse_anuncio` conserva sua relação com usuário. Adicionar relação inversa necessária no Prisma sem alterar sua semântica.

### D2 — Autorização e estados

Busca e detalhe são públicos e não exigem JWT. Criar exige JWT e participação ativa na casa selecionada. Atualizar, excluir e mudar status exigem JWT e que a participação ativa autenticada seja a criadora do anúncio; caso contrário, responder 403 (ou 404 para recurso inexistente, sem revelar IDs). Excluir é remoção lógica/fechamento quando necessário para preservar interesses e histórico; remoção física só é permitida quando não há dependências e conforme política existente. O comportamento escolhido deve ser uniforme e documentado na API.

Estados do anúncio seguem o enum existente `ABERTO`/`FECHADO`: a API pode expor os nomes de domínio `DISPONIVEL`/`FECHADO` somente se houver mapeamento explícito, mas não manter dois estados concorrentes. Novos anúncios iniciam `ABERTO`; apenas anúncios abertos aparecem na busca padrão. `PATCH` aceita alteração de status dentro do enum persistido.

### D3 — Privacidade por campo, aplicada no servidor

Em toda resposta destinada a busca pública, detalhe e interesse, `enderecoCompleto` deve ser `null` quando `exibeEnderecoCompleto=false`, e `contato` deve ser `null` quando `exibeContato=false`. A regra vale também para o dono, salvo endpoint de gestão autenticado explicitamente definido para exibir seus próprios valores. Endereço público não é inferido de `cidade`/`bairro`; ambos permanecem campos de localização aproximada. Os campos privados nunca devem entrar em logs, erros ou payloads auxiliares sem autorização.

### D4 — Busca e paginação

Filtros são cumulativos. `cidade` e `bairro` fazem busca case-insensitive parcial após normalização de espaços; `precoMin`/`precoMax` são inclusivos e validados como decimais não negativos, com mínimo ≤ máximo. O status padrão é `ABERTO`. Parâmetros `page` e `limit` têm defaults 1 e 10 e limites documentados para evitar consultas sem limite. Ordenação padrão: mais recente primeiro, com desempate estável por `id`.

Categorias visuais “Repúblicas” e “Aceita Pets”, filtros de convivência e busca por título/descrição só podem ser filtrados quando houver atributo persistido correspondente. Não inferir “aceita pets” a partir do texto livre; se o banco não comportar esses dados, a migration deve introduzir campos estruturados antes de habilitar esses filtros.

Taxonomia inicial desta change: `tipo_moradia_anuncio_enum` contém `QUARTO_INDIVIDUAL`, `VAGA_COMPARTILHADA` e `REPUBLICA`; `aceita_pets` é booleano; `fotos` é lista de URLs servidas pelo storage existente (máximo de 8 na API). “Todos os Quartos” não filtra tipo, “Repúblicas” seleciona `REPUBLICA` e “Aceita Pets” filtra `aceita_pets=true`. Regras estruturadas de convivência permanecem em `perfil_convivencia` até existir taxonomia transversal no produto; não apresentar controles avançados sem filtro persistido.

### D5 — Interesse em anúncio

Como o domínio já contém `interesse_anuncio`, a ação de contato da UI deve criar interesse autenticado em vez de revelar contato mascarado ou improvisar canal externo. Uma pessoa autenticada pode enviar mensagem curta; duplicidade por usuário/anúncio deve ser impedida ou reutilizar o interesse pendente existente. O anunciante pode consultar interesses recebidos somente nos próprios anúncios. Respostas a interesse não concedem acesso a campos privados sem uma ação explícita do anunciante que atualize as flags de exibição.

### D6 — Integração frontend

Implementar a busca no padrão de layout compartilhado existente. Manter busca e chips aplicados visíveis, cards com preço mensal, localidade aproximada, status e preferências estruturadas, e detalhe com regras de convivência. Incluir estados de loading, lista vazia, erro e paginação; filtros devem persistir na URL quando compatível com o roteamento atual e ser restaurados ao navegar de volta. Em telas pequenas, filtros avançados entram em painel acessível e os cards passam para coluna única.

O fluxo de publicação/edição deve validar os mesmos limites da API, distinguir flags de privacidade e explicar claramente o efeito de exibir endereço/contato. Usuários sem sessão podem buscar e ver dados públicos; publicar, manifestar interesse ou gerir anúncios direciona ao login e retorna ao destino quando o fluxo atual permitir.

## Contratos HTTP

Prefixo: `/rooms/listings`.

### `POST /rooms/listings` — JWT obrigatório

Cria anúncio na casa associada a uma participação ativa do usuário. `casaId` é obrigatório para resolver a residência; o servidor resolve `criado_por_participacao_id` pela sessão e não aceita identidade do anunciante fornecida pelo cliente.

Body: `titulo` (string, 1–150), `descricao` (string opcional), `preco` (decimal positivo, mapeado para `valor_mensal`), `cidade` (1–100), `bairro` (opcional, até 100), `enderecoCompleto` (opcional, até 255), `exibeEnderecoCompleto` (boolean, default false), `contato` (string requerido, limite a definir conforme formato validado), `exibeContato` (boolean, default false), `perfilConvivencia` (opcional), e campos estruturados de fotos/preferências aceitos pelo schema final. Resposta `201` com objeto de anúncio serializado e privacidade aplicada.

### `GET /rooms/listings` — público

Query: `cidade`, `bairro`, `precoMin`, `precoMax`, `status` (`ABERTO` por padrão), `aceitaPets` (boolean quando persistido), `tipoMoradia`/categoria (quando persistido), `page` (1), `limit` (10, máximo 50). Retorna `200 { data: RoomListingResponseDto[], meta: { total, page, limit, totalPages } }`; todos os campos privados passam pelo mapper de privacidade.

### `GET /rooms/listings/:id` — público

Retorna `200 RoomListingResponseDto`, incluindo detalhes públicos e flags de exibição, mas os valores de endereço/contato ficam `null` quando não autorizados. `404` se inexistente, excluído ou não publicamente disponível conforme a política de status.

### `GET /rooms/listings/mine?casaId=<uuid>` — JWT obrigatório

Lista os anúncios associados à participação do usuário autenticado, opcionalmente limitados à casa indicada. Este endpoint de gestão retorna ao anunciante seus próprios valores originais de endereço e contato, mesmo quando as flags públicas estão desativadas, para permitir editar o anúncio. A consulta pública nunca usa essa exceção.

### `POST /rooms/listings/photos?casaId=<uuid>` — JWT obrigatório

Recebe multipart `file` (JPEG/PNG/WebP, até 8 MiB), exige participação ativa na casa e armazena a imagem no serviço de storage existente. Retorna `{ "url": "..." }`; a URL pode ser incluída em `fotos` ao criar ou editar o anúncio.

### `PATCH /rooms/listings/:id` — JWT e ownership

Body parcial dos campos editáveis do POST, mais `status` (`ABERTO`/`FECHADO`). IDs de casa e anunciante não são mutáveis pelo cliente. Resposta `200 RoomListingResponseDto`; `400` para validação, `401` sem sessão, `403` sem ownership, `404` se inexistente.

### `DELETE /rooms/listings/:id` — JWT e ownership

Remove logicamente/fecha o anúncio, preservando relações de interesse; `204` sem body. `401`, `403` e `404` conforme os casos acima. Esta rota não apaga interesses em cascata.

### Interesse

`POST /rooms/listings/:id/interests` (JWT) recebe `{ "mensagem": "..." }`, cria interesse para o usuário autenticado e retorna `201` com o interesse sem dados privados do anúncio. `GET /rooms/listings/:id/interests` (JWT, anunciante) lista interessados e mensagens; `PATCH /rooms/listings/:id/interests/:interestId` (JWT, anunciante) recebe `{ "status": "ACEITO" | "RECUSADO" }`. Se o repositório optar por não incluir gestão de interesses nesta entrega, a UI não deve apresentar ação de contato funcional incompleta: o requisito de manifestação de interesse continua exigindo pelo menos a criação do interesse.

### Exemplo de resposta de busca

```json
{
  "data": [{
    "id": "uuid",
    "titulo": "Quarto individual perto da UFC",
    "descricao": "Quarto mobiliado com escrivaninha e ventilador.",
    "preco": 450.00,
    "cidade": "Quixadá",
    "bairro": "Campo Novo",
    "enderecoCompleto": null,
    "exibeEnderecoCompleto": false,
    "contato": "(88) 99999-9999",
    "exibeContato": true,
    "perfilConvivencia": "Ambiente tranquilo, focado em estudos.",
    "status": "ABERTO",
    "criadoEm": "2026-11-08T20:00:00.000Z"
  }],
  "meta": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
}
```

## Data Model Changes

Evoluir `anuncio_quarto` em `backend/prisma/schema.prisma`; manter o nome físico/tabela atual e os registros existentes. A migration deve:

- Preservar `id UUID`, `casa_id UUID`, `titulo VARCHAR(150)`, `valor_mensal DECIMAL(10,2)`, `cidade VARCHAR(100)`, `bairro VARCHAR(100)`, `status status_anuncio_enum DEFAULT ABERTO`, `exibir_endereco BOOLEAN DEFAULT false`, `endereco_referencia VARCHAR(255)`, `criado_por_participacao_id UUID` e as FKs atuais.
- Adicionar `contato VARCHAR(100) NULL` e exigir contato não vazio no DTO de criação; registros antigos permanecem nulos, sem inventar valores. No update, contato permanece nullable apenas para anúncios legados até que o anunciante o atualize.
- Mapear `exibir_endereco` para `exibeEnderecoCompleto` no client Prisma, preservando a coluna física com `@map`; manter `endereco_referencia` como referência aproximada e adicionar `endereco_completo VARCHAR(255) NULL` separada para não reinterpretar dados antigos.
- Adicionar `exibeContato BOOLEAN NOT NULL DEFAULT false`, `perfil_convivencia TEXT NULL`, `criado_em TIMESTAMPTZ NOT NULL DEFAULT now()` e `atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()`.
- Adicionar `tipo_moradia tipo_moradia_anuncio_enum NOT NULL DEFAULT QUARTO_INDIVIDUAL`, `aceita_pets BOOLEAN NOT NULL DEFAULT false` e `fotos TEXT[] NOT NULL DEFAULT '{}'`. O enum contém `QUARTO_INDIVIDUAL`, `VAGA_COMPARTILHADA`, `REPUBLICA`. Upload usa storage já integrado; limite de oito fotos. Não habilitar filtros de convivência por texto livre.
- Manter `interesse_anuncio` e `status_interesse_anuncio_enum`; adicionar timestamps/índices/unique constraint usuário-anúncio se necessário, tratando duplicatas existentes antes da constraint.
- Manter `status_anuncio_enum` (`ABERTO`, `FECHADO`); não criar enum duplicado `StatusQuartoAnuncio` com valores divergentes.
- Adicionar índices adequados para status/data, faixa de valor e localização; atualizar relações inversas em `casa`, `participacao`, `usuario` e anúncio conforme necessário.

Observação: as definições acima são alvo de evolução do modelo existente, não uma segunda tabela conceitual. A etapa de inspeção deve confirmar nomes e semânticas dos campos legados antes de gerar migration.
