# Sprint 02 — Testes das categorias da despensa

**Responsável:** Calebe Mesquita<br>
**Módulo:** Despensa virtual — categorias<br>
**Capacidade OpenSpec:** `pantry-categories`

## 1. Objetivo e estado da verificação

Este documento relaciona os critérios de categorias aos testes automatizados existentes e registra as execuções de 02/11/2026. As suítes unitária, HTTP e frontend passaram. Foi acrescentada uma suíte PostgreSQL para executar as migrations da Sprint 2 com dados sintéticos e conferir os vínculos, as restrições e o rollback.

Os testes HTTP usam serviço simulado; os testes unitários de repositório usam Prisma simulado. A integração das migrations exige `TEST_DATABASE_URL` apontando para um banco PostgreSQL de teste isolado. Essa variável não estava configurada neste ambiente; por isso, os quatro casos dessa suíte foram ignorados nesta execução e precisam ser rodados com PostgreSQL disponível. Os testes de interface usam Vitest/Testing Library em jsdom, sem navegador real.

## 2. Matriz de testes funcionais

| ID    | Fluxo                         | Resultado esperado                                                                                                                 | Cobertura automatizada relacionada                                                                                                         | Resultado manual                        |
| ----- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| CT001 | Listar categorias             | Membro ativo consulta apenas as categorias da residência solicitada.                                                               | `backend/test/unit/pantry/pantry.service.spec.ts`; `backend/test/unit/pantry/pantry.repository.spec.ts`; `backend/test/pantry.e2e-spec.ts` | Pendente                                |
| CT002 | Categorias padrão             | As oito categorias padrão têm chaves normalizadas únicas; residência nova provisiona o conjunto em transação.                      | `backend/test/unit/pantry/pantry-categories.spec.ts`; `backend/src/residences/residences.service.spec.ts`                                  | Pendente                                |
| CT003 | Criar categoria               | Nome é aparado, espaços são reduzidos e nome válido é persistido.                                                                  | `backend/test/unit/pantry/dto/pantry-category-dto.spec.ts`; `backend/test/unit/pantry/pantry.service.spec.ts`; teste HTTP da despensa      | Pendente                                |
| CT004 | Nome vazio ou longo           | API rejeita nome inválido com mensagem de validação correspondente.                                                                | `backend/test/unit/pantry/dto/pantry-category-dto.spec.ts`; `backend/test/unit/pantry/pantry.service.spec.ts`                              | Pendente                                |
| CT005 | Duplicata normalizada         | Caixa, acentos e espaços não permitem duplicata na mesma residência; conflito concorrente é tratado.                               | `backend/test/unit/pantry/pantry-categories.spec.ts`; `backend/test/unit/pantry/pantry.service.spec.ts`; teste do repositório              | Pendente                                |
| CT006 | Política de edição            | Membro sem permissão de edição é bloqueado quando a política da residência exige líderes/administradores.                          | `backend/test/unit/pantry/pantry.service.spec.ts`; teste HTTP preserva resposta de autorização                                             | Pendente                                |
| CT007 | Renomear categoria            | Rótulo muda para os itens associados, preservando relação e residência.                                                            | `backend/test/unit/pantry/pantry.repository.spec.ts`; `backend/test/unit/pantry/pantry.service.spec.ts`; teste da página                   | Pendente                                |
| CT008 | Excluir categoria em uso      | Operação é rejeitada e itens/relação permanecem intactos.                                                                          | `backend/test/unit/pantry/pantry.service.spec.ts`; `backend/test/unit/pantry/pantry.repository.spec.ts`                                    | Pendente                                |
| CT009 | Excluir categoria sem uso     | Categoria deixa de aparecer; confirmação da interface precede a chamada.                                                           | Teste da página e `backend/test/pantry.e2e-spec.ts`                                                                                        | Pendente                                |
| CT010 | Categoria de outra residência | Criação ou edição de item é rejeitada; não ocorre vínculo cruzado.                                                                 | `backend/test/unit/pantry/pantry.service.spec.ts`                                                                                          | Pendente                                |
| CT011 | Interface de gerenciamento    | Modal permite criar, renomear e excluir categoria usando confirmação.                                                              | `web/app/(private)/pantry/__test__/page.test.tsx`; `web/features/pantry/api/__test__/pantry.api.test.ts`                                   | Pendente                                |
| CT012 | Migração dos dados existentes | Rótulos são mapeados sem perda; dados inválidos/ambíguos bloqueiam a migração; não há fallback para “Outros”.                      | `backend/test/integration/sprint02-migrations.integration.test.ts` executa a migration real quando `TEST_DATABASE_URL` está definida       | Pendente de execução com PostgreSQL     |
| CT013 | Residência sem categorias     | É possível abrir o gerenciamento, criar a primeira categoria e então adicionar itens; nenhum padrão é selecionado silenciosamente. | `web/app/(private)/pantry/__test__/page.test.tsx`                                                                                          | Pendente de validação em navegador real |

## 3. Suítes automatizadas relacionadas

### Backend — Vitest

- `backend/test/unit/pantry/pantry-categories.spec.ts`: categorias padrão e normalização.
- `backend/test/unit/pantry/dto/pantry-category-dto.spec.ts`: limpeza, limites e validação de nome.
- `backend/test/unit/pantry/pantry.service.spec.ts`: participação, permissão, duplicatas, renomeação, remoção, associação por residência e concorrência.
- `backend/test/unit/pantry/pantry.repository.spec.ts`: operações persistidas simuladas, uso de categoria e atualização de rótulos.
- `backend/src/residences/residences.service.spec.ts`: criação de residência e provisionamento transacional.
- `backend/test/pantry.e2e-spec.ts`: endpoints HTTP autenticados, validação e respostas do controller; o serviço é substituído por mock.
- `backend/test/integration/sprint02-migrations.integration.test.ts`: migrations PostgreSQL reais em schema isolado; mapeamento por residência, rótulos legados preservados, índice único, chave estrangeira composta, rollback para rótulo vazio/ambíguo e constraints/versionamento da lista de compras.

### Frontend — Vitest

- `web/app/(private)/pantry/__test__/page.test.tsx`: gerenciamento no modal, criação da primeira categoria quando a residência está vazia e contexto da residência.
- `web/features/pantry/api/__test__/pantry.api.test.ts`: contrato do cliente HTTP.

## 4. Integração da migração com PostgreSQL

A suíte aplica as migrations da lista de compras e das categorias em schemas temporários, usando casas, membros e itens sintéticos. Para categorias, verifica as oito categorias padrão por residência, categorias personalizadas isoladas por casa, preservação do rótulo legado, rejeição de nome normalizado duplicado, bloqueio de vínculo cruzado entre residências e rollback total para rótulo vazio ou rótulos personalizados ambíguos. Para lista de compras, verifica estado e versão padrão, compare-and-swap por versão e constraints de quantidade/unidade, dados de compra e versão.

Use um banco PostgreSQL descartável com permissão para criar schemas e a extensão `unaccent`. A suíte cria e remove schemas com nome aleatório. Se `unaccent` ainda não estiver instalado, ele é criado em `public`; por isso, use um banco de teste dedicado. Se `TEST_DATABASE_URL` não estiver definida, os quatro casos são ignorados.

```bash
cd backend
TEST_DATABASE_URL='postgresql://usuario:senha@localhost:5432/fullhouse_test' npm run test:integration:sprint02-migrations
```

Nesta revisão, o ambiente não tinha `TEST_DATABASE_URL` nem serviço PostgreSQL acessível; os quatro casos de integração foram carregados e ignorados. A execução contra os dados reais de desenvolvimento ainda deve ser feita antes do cutover.

## 5. Resultados e comandos de execução

Execuções concluídas em 02/11/2026:

| Suíte                                     | Comando                                                                                                                                              | Resultado                                                                                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Backend — todos os testes unitários       | `cd backend && ./node_modules/.bin/vitest run --reporter=dot`                                                                                        | 35 arquivos; 234 testes aprovados.                                                                                           |
| Backend — testes HTTP da despensa e lista | `cd backend && ./node_modules/.bin/vitest run --config ./vitest.config.e2e.ts test/pantry.e2e-spec.ts test/shopping-list.e2e-spec.ts --reporter=dot` | 2 arquivos; 16 testes aprovados no total.                                                                                    |
| Frontend — todos os testes                | `cd web && npx --yes --package=node@22 node ./node_modules/vitest/vitest.mjs run --reporter=dot`                                                     | 56 arquivos; 171 testes aprovados, usando Node 22. O total é do projeto e inclui o teste novo de recuperação sem categorias. |
| Integração das migrations                 | `cd backend && TEST_DATABASE_URL=... npm run test:integration:sprint02-migrations`                                                                   | 1 arquivo carregado; 4 casos ignorados porque `TEST_DATABASE_URL` não estava definida e não havia PostgreSQL acessível.      |

Os números totais das suítes incluem testes de outros módulos. A suíte HTTP da despensa usa o serviço simulado e não cobre persistência real. A suíte PostgreSQL adicionada cobre as migrations e as constraints dos dois módulos com dados sintéticos; ela não substitui a conferência dos dados reais antes do cutover.

## 6. Pendências de validação

- Rodar os quatro casos de `test:integration:sprint02-migrations` em um PostgreSQL de teste.
- Diagnosticar rótulos reais do banco e resolver colisões que exijam aprovação antes de aplicar a migração.
- Aplicar a migração no banco local de desenvolvimento e confirmar quantidades/vínculos por residência.
- Validar visualmente criar, renomear, filtrar e remover categorias no navegador.
- Salvar as três capturas desta funcionalidade em `docs/sprints/sprint02/Calebe/categorias-da-despensa/evidencias/` (`testes-backend.png`, `testes-backend-e2e.png` e `testes-front.png`). Após executar a suíte PostgreSQL, salvar também `testes-migracoes-postgres.png` nesta pasta.
