# Sprint 02 — Testes de subgrupos de despesas

**Responsável:** Iago
**Módulo:** Financeiro — subgrupos e rateios por despesa
**Requisito relacionado:** extensão complementar de RF005/US004 e RF006/US005

## 1. Objetivo e escopo

Este documento registra os testes automatizados das regras de subgrupos adicionadas ao módulo Financeiro. Os testes unitários usam mocks para serviço e repositório; não aplicam operações em um PostgreSQL real. Os testes de interface cobrem a experiência financeira geral e estão documentados na Sprint 01.

## 2. Matriz de testes

| ID | Cenário | Resultado esperado | Cobertura automatizada |
| --- | --- | --- | --- |
| SG001 | Criar subgrupo com nome e participantes | Criação persiste os integrantes ativos da residência do criador. | DTO e testes do serviço/repositório. |
| SG002 | Validar participantes da residência | Lista vazia, IDs duplicados, moradores inativos e moradores de outra casa são rejeitados. | DTO, serviço e repositório. |
| SG003 | Editar subgrupo | Criador pode alterar nome e integrantes; outro usuário é proibido. | Serviço e repositório. |
| SG004 | Atualizar integrantes | Inclusões e remoções alteram as associações ativas de forma transacional. | Repositório. |
| SG005 | Associar várias despesas | Despesas distintas podem referenciar o mesmo subgrupo sem compartilhar seus dados. | Serviço. |
| SG006 | Rateio igualitário | Parcelas são calculadas em centavos para os participantes da despesa. | `expenses.repository.spec.ts`. |
| SG007 | Rateio personalizado válido | Todos os participantes recebem uma parcela e a soma é igual ao total da despesa. | `expenses.repository.spec.ts`. |
| SG008 | Rateio personalizado inválido | Participante ausente ou soma diferente do total impede a gravação das parcelas. | `expenses.repository.spec.ts`. |
| SG009 | Comprovante por despesa | O anexo é associado à conta individual, não ao subgrupo como um todo. | Fluxo de despesa; sem teste unitário específico de interface nesta suíte. |

## 3. Arquivos de teste

| Arquivo | Cobertura |
| --- | --- |
| `backend/test/unit/expenses/create-expense-subgroup.dto.spec.ts` | Validação do nome, IDs e participantes informados para criação. |
| `backend/test/unit/expenses/expenses.subgroups.service.spec.ts` | Criação, consulta, edição pelo criador, validação de participantes e múltiplas despesas no subgrupo. |
| `backend/test/unit/expenses/expenses.subgroups.repository.spec.ts` | Atualização transacional, autorização, residência e estado dos integrantes. |
| `backend/test/unit/expenses/expenses.repository.spec.ts` | Persistência de despesas e parcelas igualitárias/personalizadas, incluindo rejeição de rateios inválidos. |

## 4. Comandos e resultados

Execute a partir da raiz do repositório.

### Testes focados em subgrupos

```bash
cd backend
pnpm exec vitest run test/unit/expenses/create-expense-subgroup.dto.spec.ts test/unit/expenses/expenses.subgroups.service.spec.ts test/unit/expenses/expenses.subgroups.repository.spec.ts --reporter=verbose
```

Resultado registrado em 02/11/2026: **3 arquivos e 20 testes aprovados**. A captura está em `docs/sprints/sprint02/Iago/evidencias/testes-backend-unitarios.png`.

### Testes de despesas e subgrupos, incluindo rateios

```bash
cd backend
pnpm exec vitest run test/unit/expenses --reporter=verbose
```

Resultado registrado em 02/11/2026: **5 arquivos e 58 testes aprovados**. Essa suíte também inclui os testes de rateio do repositório descritos em SG006–SG008.

## 5. Limites da verificação

As verificações acima são unitárias e usam mocks. Elas não confirmam migrações nem persistência em banco real. A coluna de cobertura não afirma validação visual manual; a conferência da tela deve ser feita no navegador quando necessária.
