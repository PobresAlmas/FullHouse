# Sprint 02 — Implementação das categorias da despensa

**Responsável:** Calebe Mesquita<br>
**Módulo principal:** Despensa virtual — categorias<br>
**Capacidade OpenSpec:** `pantry-categories`

## 1. Visão geral

As categorias agora são registros persistidos por residência, associados aos itens da despensa por identificador. A página da despensa carrega o catálogo pela API e oferece gerenciamento em um modal. O backend NestJS valida a residência, a participação e as regras de edição.

O código e as suítes automatizadas estão implementados. **A migração criada ainda precisa ser aplicada e validada no banco com os dados reais.** Até essa etapa, não se deve considerar concluída a ativação da nova relação no ambiente local.

## 2. Frontend

| Recurso | Arquivo principal | Papel |
| --- | --- | --- |
| Página da despensa | `web/app/(private)/pantry/page.tsx` | Carrega categorias da residência, usa categoria persistida nos formulários e filtros e apresenta o modal de gerenciamento. |
| Cliente HTTP e tipos | `web/features/pantry/api/pantry.api.ts` | Consulta, cria, renomeia e remove categorias. |
| Testes da tela | `web/app/(private)/pantry/__test__/page.test.tsx` | Verifica seleção de residência e o ciclo de criação, renomeação e remoção com confirmação. |
| Testes do cliente | `web/features/pantry/api/__test__/pantry.api.test.ts` | Verifica rotas e payloads de categoria. |

O modal “Gerenciar categorias” permite adicionar, renomear e pedir exclusão com confirmação. A tela considera a política de edição da residência ao habilitar o gerenciamento. O formulário de item usa as categorias recebidas pela API, não uma lista local como fonte definitiva.

## 3. Backend

A funcionalidade reutiliza o módulo existente `backend/src/pantry/`:

| Arquivo | Responsabilidade |
| --- | --- |
| `pantry.controller.ts` | Endpoints autenticados de consulta e CRUD das categorias. |
| `pantry.service.ts` | Validação de vínculo e permissão, normalização, duplicatas e bloqueio de exclusão em uso. |
| `pantry.repository.ts` | Consultas e alterações persistidas, incluindo atualização do rótulo legado de itens ao renomear. |
| `pantry-categories.ts` | Oito categorias padrão e normalização compartilhada. |
| `dto/create-pantry-category.dto.ts` e `dto/update-pantry-category.dto.ts` | Validação e limpeza do nome. |

### 3.1. Endpoints identificados

Todas as rotas ficam sob `/residences/:residenceId/pantry`, exigem autenticação JWT e validam UUIDs.

| Método | Rota | Função |
| --- | --- | --- |
| `GET` | `/categories` | Listar categorias da residência. |
| `POST` | `/categories` | Criar categoria. |
| `PATCH` | `/categories/:categoryId` | Renomear categoria. |
| `DELETE` | `/categories/:categoryId` | Remover categoria sem itens associados. |

### 3.2. Regras e persistência

- A consulta exige participação ativa. Gestão usa `requireCreateEditPermission`, que aplica `TODOS` ou restringe criação/edição a líderes e administradores quando a política da residência é `LIDERES`.
- Nome de exibição é aparado e tem espaços consecutivos reduzidos a um; a chave de unicidade também ignora caixa e diacríticos.
- O banco mantém unicidade da chave normalizada por residência.
- A remoção verifica uso e é protegida por chave estrangeira restritiva, cobrindo a corrida entre associação e exclusão.
- Novas residências recebem as oito categorias padrão dentro da transação de criação da residência e do vínculo inicial.
- O item da despensa passa a manter `categoria_id`, com referência composta que garante categoria da mesma residência. A coluna textual antiga permanece no modelo nesta versão.
- Renomear categoria atualiza a categoria persistida e o rótulo textual denormalizado dos itens na mesma transação.
- A migração `backend/prisma/migrations/20261101000000_add_pantry_categories/migration.sql` cria categorias iniciais, preserva/cria categorias customizadas e associa os itens existentes. Ela interrompe a transação quando encontra rótulo vazio, colisão customizada ambígua ou item sem associação; não atribui “Outros” automaticamente.
- O modelo Prisma está em `backend/prisma/schema.prisma`.

## 4. Rastreabilidade

| Entrega | Critério | Evidência no código |
| --- | --- | --- |
| CRUD de categorias | Criar, consultar, renomear e remover | Rotas do `PantryController`, serviço e repositório. |
| Unicidade por residência | Caixa, acentos e espaços não criam duplicatas | `normalizePantryCategoryName` e índice único no banco. |
| Proteção de categoria em uso | Não remover categoria vinculada a item | Verificação no serviço e FK restritiva da migração. |
| Categoria do mesmo domicílio | Associação não pode cruzar residências | Validação no serviço e FK composta. |
| Valores iniciais | Oito categorias por nova residência | `DEFAULT_PANTRY_CATEGORIES` e criação transacional em `ResidencesRepository`. |
| Migração sem fallback silencioso | Dados ambíguos/sem rótulo válido interrompem o cutover | Migração SQL transacional com verificações antes de tornar a relação obrigatória. |

## 5. Estado da entrega

CRUD, integração da despensa e testes de aplicação estão presentes. Permanecem pendentes o diagnóstico no banco real, a aplicação da migração, a validação de todas as associações e o ensaio de rollback definidos nas tarefas OpenSpec 1.2–1.3, 2.5–2.8 e 4.2–4.5.
