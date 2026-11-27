# Sprint 02 — Testes da lista de compras

**Responsável:** Calebe Mesquita<br>
**Módulo:** Lista de compras compartilhada<br>
**Capacidade OpenSpec:** `shopping-list`

## 1. Objetivo e estado da verificação

Este documento relaciona os requisitos aos testes automatizados existentes e registra os resultados executados em 02/11/2026. Os testes unitários, de interface e o contrato HTTP passaram. Os testes HTTP usam o serviço simulado; não exercitam o banco real. Foi criada uma suíte PostgreSQL para as migrations da Sprint 2, mas ela requer `TEST_DATABASE_URL` e não foi executada nesta revisão.

## 2. Matriz de testes funcionais

| ID    | Fluxo                                 | Resultado esperado                                                                         | Cobertura automatizada relacionada                                                                                                                                            | Resultado manual |
| ----- | ------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| CT001 | Acesso sem sessão                     | API retorna `401`.                                                                         | `backend/test/shopping-list.e2e-spec.ts`; `backend/test/unit/shopping-list/shopping-list.service.spec.ts`                                                                     | Pendente         |
| CT002 | Consulta por residência               | Membro ativo recebe itens ordenados apenas da residência consultada.                       | `backend/test/unit/shopping-list/shopping-list.service.spec.ts`; `backend/test/unit/shopping-list/shopping-list.repository.spec.ts`; `backend/test/shopping-list.e2e-spec.ts` | Pendente         |
| CT003 | Criar item                            | Item inicia pendente; nome, quantidade, unidade e observação são validados.                | `backend/test/unit/shopping-list/dto/shopping-list-dto.spec.ts`; `backend/test/unit/shopping-list/shopping-list.service.spec.ts`; `backend/test/shopping-list.e2e-spec.ts`    | Pendente         |
| CT004 | Aviso de duplicata                    | Nome equivalente pendente mostra aviso; confirmar cria outro item e cancelar não envia.    | `web/app/(private)/shopping-list/__test__/page.test.tsx`                                                                                                                      | Pendente         |
| CT005 | Item equivalente comprado             | Não gera aviso de duplicata pendente.                                                      | `web/app/(private)/shopping-list/__test__/page.test.tsx`                                                                                                                      | Pendente         |
| CT006 | Editar e limpar campos                | Edição usa versão atual e aceita limpar dados opcionais sem separar quantidade de unidade. | `backend/test/unit/shopping-list/shopping-list.service.spec.ts`; `backend/test/unit/shopping-list/shopping-list.repository.spec.ts`; testes da página                         | Pendente         |
| CT007 | Concluir e reabrir                    | Conclusão registra autor/horário; reabertura limpa os dados de compra.                     | `backend/test/unit/shopping-list/shopping-list.repository.spec.ts`; `backend/test/unit/shopping-list/shopping-list.service.spec.ts`; testes da página                         | Pendente         |
| CT008 | Concorrência e remoção                | Versão desatualizada gera conflito; remoção envia versão e pede confirmação.               | `backend/test/unit/shopping-list/shopping-list.repository.spec.ts`; teste HTTP; testes do cliente e da página                                                                 | Pendente         |
| CT009 | Trocar residência                     | Dados anteriores são limpos e itens da nova residência são carregados.                     | `web/app/(private)/shopping-list/__test__/page.test.tsx`                                                                                                                      | Pendente         |
| CT010 | Estados de tela                       | Lista vazia, erro com nova tentativa e ausência de residência são diferenciados.           | `web/app/(private)/shopping-list/__test__/page.test.tsx`                                                                                                                      | Pendente         |
| CT011 | Separação da despensa e do financeiro | Marcar comprado não altera estoque nem cria lançamento financeiro.                         | `backend/test/unit/shopping-list/shopping-list.service.spec.ts` verifica persistência isolada; sem teste integrado entre módulos                                              | Pendente         |

## 3. Suítes automatizadas relacionadas

### Backend — Vitest

- `backend/test/unit/shopping-list/dto/shopping-list-dto.spec.ts`: campos, unidades, quantidades, observação, status e versão.
- `backend/test/unit/shopping-list/shopping-list.service.spec.ts`: vínculo, ordenação, validações, autoria, transições e conflitos.
- `backend/test/unit/shopping-list/shopping-list.repository.spec.ts`: escopo por residência, persistência, compare-and-swap, idempotência e remoção.
- `backend/test/shopping-list.e2e-spec.ts`: contrato HTTP autenticado, validação, rotas e respostas. O serviço é substituído por mock neste arquivo.

### Frontend — Vitest

- `web/app/(private)/shopping-list/__test__/page.test.tsx`: tela e fluxos de usuário.
- `web/features/shopping-list/api/__test__/shopping-list.api.test.ts`: cliente HTTP, payloads e versões.
- `web/components/layout/__test__/AppSidebar.test.tsx`: navegação autenticada e residência selecionada.

## 4. Integração SQL PostgreSQL

`backend/test/integration/sprint02-migrations.integration.test.ts` executa as migrations da lista de compras e das categorias em schemas temporários. Para a lista, verifica estado inicial `PENDENTE`, versão inicial 1, atualização condicional por versão e restrições de quantidade/unidade, metadados de compra e versão positiva. O teste valida o schema e as constraints SQL; não inicializa o serviço Nest nem o repositório Prisma.

Use um banco PostgreSQL descartável com permissão para criar schemas e a extensão `unaccent`. A suíte cria e remove schemas com nome aleatório. Se `unaccent` ainda não estiver instalado, ele é criado em `public`; por isso, use um banco de teste dedicado. Sem `TEST_DATABASE_URL`, os quatro casos de integração são ignorados.

```bash
cd backend
TEST_DATABASE_URL='postgresql://usuario:senha@localhost:5432/fullhouse_test' npm run test:integration:sprint02-migrations
```

## 5. Resultados e comandos de execução

Execuções concluídas em 02/11/2026:

| Suíte                               | Comando                                                                                                                                              | Resultado                                                                                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Backend — todos os testes unitários | `cd backend && ./node_modules/.bin/vitest run --reporter=dot`                                                                                        | 35 arquivos; 234 testes aprovados.                                                                                                      |
| Backend — HTTP da despensa e lista  | `cd backend && ./node_modules/.bin/vitest run --config ./vitest.config.e2e.ts test/pantry.e2e-spec.ts test/shopping-list.e2e-spec.ts --reporter=dot` | 2 arquivos; 16 testes aprovados.                                                                                                        |
| Frontend — todos os testes          | `cd web && npx --yes --package=node@22 node ./node_modules/vitest/vitest.mjs run --reporter=dot`                                                     | 56 arquivos; 171 testes aprovados, usando Node 22. O total é do projeto; inclui o novo teste de recuperação da despensa sem categorias. |
| Integração das migrations           | `cd backend && TEST_DATABASE_URL=... npm run test:integration:sprint02-migrations`                                                                   | 1 arquivo carregado; 4 casos ignorados por falta de PostgreSQL acessível nesta revisão.                                                 |

Os totais de backend e frontend são das suítes gerais do projeto, não apenas da lista de compras. Os testes da funcionalidade estão em `backend/test/unit/shopping-list/`, `backend/test/shopping-list.e2e-spec.ts`, `web/app/(private)/shopping-list/__test__/page.test.tsx` e `web/features/shopping-list/api/__test__/shopping-list.api.test.ts`. O teste HTTP confirma autenticação, validação e contrato das rotas com o serviço simulado.

Salve as três capturas desta funcionalidade em `docs/sprints/sprint02/Calebe/lista-de-compras/evidencias/`: `testes-backend.png`, `testes-backend-e2e.png` e `testes-front.png`. A captura da suíte PostgreSQL compartilhada pode ser salva aqui como `testes-migracoes-postgres.png` se ela for executada. Ainda não há evidências de validação manual no navegador nem execução das migrations contra PostgreSQL nesta revisão.
