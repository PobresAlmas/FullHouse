# Sprint 02 — Implementação de subgrupos de despesas

**Responsável:** Iago
**Módulo principal:** Financeiro — subgrupos e rateio de despesas
**Requisito relacionado:** extensão complementar de RF005/US004 e RF006/US005

## 1. Visão geral

Subgrupos agrupam moradores que compartilham determinadas contas. Cada despesa permanece como um registro individual associado opcionalmente a um subgrupo. Um subgrupo pode, portanto, ter várias despesas, e cada uma mantém seus próprios valores, parcelas e comprovantes.

## 2. Frontend

A tela Financeiro em `web/app/(private)/finance/page.tsx` permite criar e editar subgrupos, consultar todos os subgrupos, adicionar várias despesas individuais e definir a divisão financeira de cada conta. A tela oferece divisão igualitária ou personalizada e permite anexar comprovantes à despesa correspondente.

O cliente HTTP está em `web/features/expenses/api/expenses.api.ts`. Os testes web associados estão em `web/app/(private)/finance/__test__/page.test.tsx` e `web/features/expenses/api/__test__/expenses.api.test.ts`.

## 3. Backend

O módulo está em `backend/src/expenses/`. O controller define as rotas autenticadas; serviço e repositório aplicam autorização, validam participantes e persistem os dados com Prisma.

| Arquivo | Responsabilidade |
| --- | --- |
| `backend/src/expenses/dto/create-expense-subgroup.dto.ts` | Valida nome e lista de participantes no cadastro do subgrupo. |
| `backend/src/expenses/expenses.service.ts` | Verifica acesso à residência, lista moradores e subgrupos, cria subgrupos e restringe edição ao criador. |
| `backend/src/expenses/expenses.repository.ts` | Persiste subgrupos e integrantes; cria parcelas igualitárias ou personalizadas por despesa. |
| `backend/prisma/schema.prisma` | Define as relações entre residência, subgrupo, despesas, rateios e comprovantes. |

### 3.1. Endpoints

Todas as rotas exigem autenticação JWT.

| Método | Rota | Função |
| --- | --- | --- |
| `GET` | `/expenses/homes/:homeId/members` | Lista moradores disponíveis da residência. |
| `GET` | `/expenses/subgroups` | Lista subgrupos disponíveis para despesas. |
| `GET` | `/expenses/subgroups/all` | Lista subgrupos visíveis ao usuário. |
| `POST` | `/expenses/subgroups` | Cria subgrupo com nome e participantes. |
| `PUT` | `/expenses/subgroups/:id` | Atualiza nome e participantes, somente pelo criador. |

Despesas seguem as rotas do CRUD descritas na implementação da Sprint 01; o payload de criação/edição inclui o subgrupo opcional e as parcelas personalizadas da conta.

## 4. Regras de persistência e validação

- Participantes devem estar ativos na residência proprietária do subgrupo.
- A alteração do conjunto de integrantes é transacional; a participação removida deixa de ser ativa no subgrupo.
- A edição exige que o usuário seja o criador e que o subgrupo pertença a uma residência à qual ele tenha acesso.
- Rateios personalizados não podem omitir ou duplicar participantes e precisam somar o valor exato da despesa, calculado em centavos.
- O rateio e o comprovante pertencem à despesa individual. Várias despesas do mesmo subgrupo não compartilham parcelas nem anexos.

## 5. Rastreabilidade

| Entrega | Evidência |
| --- | --- |
| Criar/listar subgrupos e selecionar moradores | Controller, serviço, DTO e testes unitários de subgrupo. |
| Editar somente como criador | Verificação no serviço/repositório e testes de autorização. |
| Manter várias contas em um subgrupo | Despesas gravadas individualmente e cenário de serviço. |
| Rateio igual ou personalizado por conta | Tabela `rateio_despesa`, validações do repositório e controles do formulário. |
| Comprovante independente por conta | Relação do comprovante com a despesa e interface de upload na conta. |

Os cenários executados e comandos estão em `docs/sprints/sprint02/Iago/subgrupos/testes.md`.
