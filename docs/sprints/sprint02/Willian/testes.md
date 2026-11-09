# Sprint 02 — Testes funcionais e evidências: Quartos

**Responsável:** Antonio Willian Silva Oliveira<br>
**Módulo:** Busca e anúncio de quartos disponíveis<br>
**Requisito relacionado:** RF015 — US013<br>
**Data da execução automatizada:** 08/11/2026

## 1. Objetivo e escopo

Este documento registra os comandos e resultados observados para a change `add-room-listings` e orienta a demonstração manual integrada. Os testes unitários/frontend usam mocks quando indicado; o E2E específico valida HTTP/autorização com a configuração de teste do projeto. A migration foi executada em schema PostgreSQL isolado. A interface real com API e banco, responsividade visual e acessibilidade ainda devem ser demonstradas manualmente.

## 2. Resultado da execução automatizada

| Suíte/verificação | Comando | Resultado observado |
| --- | --- | --- |
| Backend unitário completo | `cd backend && pnpm test` | **Aprovado:** 40 arquivos, 278 testes. |
| Frontend completo | `cd web && pnpm exec vitest run` | **Aprovado:** 58 arquivos, 178 testes. |
| Quartos — E2E | `cd backend && pnpm exec vitest run --config ./vitest.config.e2e.ts test/rooms.e2e-spec.ts` | **Aprovado:** 1 arquivo, 6 testes. |
| Migration — PostgreSQL isolado | Ver comando da seção 5.2 | **Aprovado:** 1 teste; dados legados, interesse, defaults e rollback verificados no schema temporário. |
| E2E backend completo | `cd backend && pnpm test:e2e` | **49 passaram; 1 falhou** em teste preexistente de despesas (`test/expenses.e2e-spec.ts`), por divergência do argumento adicional `HOME` em `expensesService.findAll`. O E2E de Quartos passou. |
| Build backend | `cd backend && pnpm build` | **Aprovado.** |
| Build frontend | `cd web && pnpm build` | **Aprovado.** |
| Lint backend/frontend dos arquivos alterados | comandos direcionados via ESLint | **Aprovado.** |
| Prisma | `pnpm exec prisma validate --config prisma7.config.ts` e `pnpm exec prisma generate --config prisma7.config.ts` (em `backend`) | **Aprovados.** |
| OpenSpec | `openspec validate add-room-listings --strict` | **Aprovado.** |

Não foi executada a suíte completa E2E com resultado integralmente verde, devido à falha não relacionada descrita acima. O QA visual de viewport móvel e leitor de tela permanece pendente; não foram geradas capturas nesta rodada.

### Cobertura específica verificada

- Serviço: filtros cumulativos, paginação, status, criação/edição, ownership e interesses.
- Mapper: todas as combinações independentes de `exibeEnderecoCompleto` e `exibeContato`, sem vazamento de campo oculto.
- DTOs: validação dos campos e parâmetros de busca.
- E2E: busca pública, filtros e metadados, autenticação das mutações, participação/ownership, estados e privacidade.
- Frontend: filtros e chips, resultados/estados, formulário e gestão, detalhe, privacidade e manifestação de interesse.
- Integração da migration: anúncio e interesse legados permanecem; campos/defaults novos são conferidos; schema descartável volta ao estado original via rollback.

## 3. Preparar execução local

Use apenas banco de desenvolvimento ou descartável. O banco `fullhouse` observado nesta execução já continha tabelas, mas não possuía `_prisma_migrations`; não rode `migrate reset` ou aplique toda a cadeia de migrations nele sem primeiro conferir o estado e proteger os dados.

Verifique os serviços e arquivos de ambiente conforme o setup do projeto. Para iniciar PostgreSQL pelo Compose, se essa configuração estiver disponível no ambiente:

```bash
docker compose up -d postgres
docker compose ps
```

Configure `backend/.env` com os valores locais exigidos pelo backend e `web/.env.local` com a URL da API local, por exemplo:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Gere o cliente Prisma (não aplica migration):

```bash
cd backend
pnpm exec prisma generate --config prisma7.config.ts
```

Para aplicar migration manualmente, use banco descartável e siga o procedimento de baseline/migrations do repositório. Nesta rodada, a migration específica foi exercitada pelo teste de integração em schema isolado; a base `fullhouse` não foi migrada em lote.

## 4. Executar testes automatizados

### Backend unitário

```bash
cd backend
pnpm test
```

### Frontend completo

```bash
cd web
pnpm exec vitest run
```

### E2E de Quartos

```bash
cd backend
pnpm exec vitest run --config ./vitest.config.e2e.ts test/rooms.e2e-spec.ts
```

### Teste de integração da migration

O teste usa `TEST_DATABASE_URL` e cria schema temporário no PostgreSQL apontado por `DATABASE_URL`. O comando abaixo carrega o `.env` sem imprimir os valores e passa a URL apenas ao processo do teste:

```bash
cd backend
node --env-file=.env --input-type=module -e 'process.env.TEST_DATABASE_URL = process.env.DATABASE_URL; const { spawnSync } = await import("node:child_process"); const result = spawnSync("pnpm", ["exec", "vitest", "run", "--config", "./vitest.config.integration.ts", "test/integration/room-listings-migration.integration.test.ts"], { stdio: "inherit", env: process.env }); process.exit(result.status ?? 1);'
```

Execute apenas contra PostgreSQL de desenvolvimento/teste com permissão para criar e remover schema temporário. Não substitua a URL por uma base de produção.

### Builds e OpenSpec

```bash
cd backend && pnpm build
cd ../web && pnpm build
cd .. && openspec validate add-room-listings --strict
```

## 5. Roteiro de teste manual e evidências

Execute com frontend e API iniciados, conta de teste, casa com participação ativa e anúncios/dados fictícios. Use duas contas/casas para verificar ownership. A URL da interface é a porta indicada pelo servidor Next.js (neste projeto normalmente `http://localhost:3001`).

Inicie em terminais separados:

```bash
cd backend
pnpm start:dev
```

```bash
cd web
pnpm dev
```

### Matriz de cenários

| ID | Cenário e passos | Resultado esperado | Status manual |
| --- | --- | --- | --- |
| MR01 | Abrir Quartos pela navegação autenticada e também consultar a tela sem sessão. | Busca pública carrega; gestão requer login e retorna ao destino após autenticação quando acionada. | A executar |
| MR02 | Buscar por cidade e bairro, aplicar faixa de preço e remover chips individualmente. | Filtros são cumulativos, URL acompanha consulta quando suportado, resultados e contagem correspondem aos critérios. | A executar |
| MR03 | Usar abas/tipo de moradia e filtro Aceita Pets. | Só aparecem anúncios com os valores estruturados persistidos correspondentes. | A executar |
| MR04 | Avançar página e atualizar/reabrir a URL filtrada. | Paginação e filtros continuam consistentes; metadados/resultados refletem a página. | A executar |
| MR05 | Abrir card e detalhe de anúncio com ambas flags privadas desligadas. | Endereço completo e contato aparecem ocultos/indicados como indisponíveis. | A executar |
| MR06 | Testar flags independentes: somente endereço ou somente contato visível. | Cada campo respeita sua própria flag nas respostas e na tela; nenhum valor oculto vaza. | A executar |
| MR07 | Publicar com conta que tenha participação ativa, fotos e flags desligadas. | Anúncio é criado, inicia aberto e pode ser encontrado; campos privados seguem ocultos publicamente. | A executar |
| MR08 | Tentar publicar sem participação ativa ou com valores inválidos. | API/UI rejeita e apresenta erro sem criar anúncio. | A executar |
| MR09 | Editar e fechar/reabrir anúncio com a conta anunciante. | Campos/status são atualizados; anúncio fechado deixa a busca pública. | A executar |
| MR10 | Tentar editar/remover com outra conta; depois remover com o anunciante. | Terceiro recebe acesso negado; anunciante remove/fecha e interesses históricos são mantidos. | A executar |
| MR11 | Manifestar interesse autenticado e tentar repetir enquanto pendente. | Primeiro interesse é registrado; não há duplicidade, e resposta não revela endereço/contato ocultos. | A executar |
| MR12 | Conferir busca vazia, erro de rede, navegação só por teclado e viewport estreita. | Estados vazios/erro são distintos; controles têm foco/nomes acessíveis e não há sobreposição que impeça ações. | A executar |

### Capturas

Salve capturas reais em `docs/sprints/sprint02/Willian/evidencias/` (crie a pasta caso ainda não exista). Sugestão de nomes:

1. `01-quartos-busca.png` — página com busca e cards carregados.
2. `02-quartos-filtros.png` — filtros aplicados e chips removíveis.
3. `03-quartos-detalhe-privacidade.png` — detalhe demonstrando endereço/contato ocultos.
4. `04-quartos-flags-independentes.png` — comportamento de uma flag ativa e a outra desativada.
5. `05-quartos-publicacao.png` — formulário preenchido com valores fictícios e opções de privacidade.
6. `06-quartos-meus-anuncios.png` — anúncio criado/editado na área de gestão.
7. `07-quartos-interesse.png` — fluxo de manifestação/consulta de interesse sem dados privados indevidos.
8. `08-quartos-mobile.png` — viewport estreita com filtros/cards utilizáveis.
9. `09-testes-backend.png` — terminal mostrando comando e resumo unitário/E2E específico aprovados.
10. `10-testes-frontend.png` — terminal mostrando comando e resumo do Vitest frontend.
11. `11-migration-integration.png` — terminal com resultado do teste de migration isolada.

No Linux, use a ferramenta de captura do ambiente gráfico ou `Print Screen`; salve cada estado como PNG. Não altere a imagem para simular resultados. Use anúncios e contas fictícios e não mostre senhas, tokens, cookies, dados pessoais ou conteúdo de `.env`. A pasta de evidências deve conter somente capturas efetivamente feitas; os cenários desta lista ainda estão pendentes de execução manual.

## 6. Registro e conclusão

**Testes automatizados:** backend unitário 278/278; frontend 178/178; E2E de Quartos 6/6; migration isolada 1/1 aprovados. Builds NestJS/Next.js, geração/validação Prisma e validação OpenSpec passaram. E2E completo: 49 aprovados e 1 falha preexistente de despesas, descrita acima.<br>
**Testes manuais:** a executar, incluindo responsividade, teclado e leitor de tela.<br>
**Evidências:** ainda não capturadas; salvar na pasta indicada após executar os cenários.
