# Sprint 01 — Testes funcionais e evidências: despesas e subgrupos

**Responsável:** Iago
**Módulo:** Gestão de despesas e subgrupos (tela Financeiro)
**Requisitos relacionados:** RF005 — US004; RF006 — US005 (parcial)
**Base documental:** Documento de Especificação de Requisitos do FullHouse, RF005/RF006 — US004/US005.

## 1. Objetivo e escopo

Verificar os testes automatizados de despesas e subgrupos, comparar sua organização com os demais módulos e relacionar a cobertura aos critérios de aceitação de US004/US005 e às regras complementares de subgrupos.

Os testes HTTP E2E e web registrados anteriormente foram executados em 20/10/2026. A suíte unitária de despesas e subgrupos foi executada em 02/11/2026. O E2E inicializa o controller HTTP, mas substitui `ExpensesService` por mock. Os testes do repositório inspecionam operações e consultas Prisma com mocks; não são uma integração com banco de dados real.

Os testes automatizados não substituem a conferência visual da tela. A matriz separa os resultados automatizados da validação manual da interface.

## 2. Critérios de aceitação de US004 e US005

**US004 — Cadastro das despesas do grupo**

- A despesa deve ter descrição, valor, data de vencimento e indicação de conta fixa ou variável.
- O valor deve ser dividido igualmente entre os moradores participantes, exibindo a parte de cada um.
- A despesa cadastrada deve ficar visível para todos os membros do grupo.

**US005 — Marcar a parte da despesa como paga**

- Ao marcar sua parte como paga, a data do pagamento deve ser registrada.
- Todos os membros do grupo devem ver quem já pagou e quem ainda não pagou.
- A despesa deve ser marcada como concluída automaticamente quando todas as partes forem pagas.

**Critérios complementares — Subgrupos de despesas**

- Criar subgrupo com nome e moradores ativos escolhidos na residência.
- Permitir edição de nome e participantes somente ao criador.
- Vincular várias despesas distintas ao mesmo subgrupo.
- Dividir cada despesa entre os participantes do subgrupo, igualmente ou com valores personalizados cuja soma corresponda ao total.

## 3. Matriz de testes funcionais

| ID    | Requisito / fluxo                  | Procedimento resumido                                                      | Resultado esperado                                                               | Cobertura automatizada relacionada         | Resultado manual                                    |
| ----- | ---------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------- |
| CT001 | RF005 / US004 — cadastro           | Cadastrar uma despesa com descrição, valor e vencimento válidos.           | Despesa é enviada e aparece na lista.                                            | Serviço, E2E CRUD e teste da página        | Pendente                                            |
| CT002 | Campos obrigatórios                | Tentar enviar formulário vazio e enviar dados obrigatórios ausentes à API. | Formulário mostra erro; API rejeita dados inválidos.                             | E2E de campos ausentes e teste da página   | Pendente                                            |
| CT003 | Valor inválido                     | Enviar valor zero ou negativo.                                             | Cadastro é bloqueado com erro HTTP 400 ou mensagem amigável.                     | E2E parametrizado (`0`, `-1`) e página     | Pendente                                            |
| CT004 | Data inválida                      | Enviar uma data inexistente, como `2026-02-31`.                            | API rejeita com HTTP 400.                                                        | `expenses.e2e-spec.ts`                     | Pendente                                            |
| CT005 | Listagem e totalizador             | Exibir despesas de R$ 120,00 e R$ 80,00.                                   | As duas despesas aparecem e o total exibido é R$ 200,00.                         | Teste da página Financeiro                 | Pendente                                            |
| CT006 | Alteração de status                | Alterar uma despesa de Pendente para Pago.                                 | Status geral aparece como Pago.                                                  | Serviço, E2E CRUD e teste da página        | Pendente                                            |
| CT007 | Edição e exclusão                  | Editar uma despesa; confirmar sua exclusão.                                | Dados atualizados; despesa removida da lista por exclusão lógica.                | Página, cliente API e E2E CRUD             | Pendente                                            |
| CT008 | Acesso por residência              | Consultar despesas sem participação ativa na residência.                   | A despesa de outra residência não é retornada.                                   | Testes de serviço/repositório              | Pendente; filtro Prisma testado sem banco integrado |
| CT009 | Histórico                          | Consultar a lista de despesas.                                             | Resultados ordenados por vencimento decrescente, com desempate por ID.           | `expenses.repository.spec.ts`              | Pendente                                            |
| CT010 | Filtros de pagamento               | Consultar status Pago e Pendente.                                          | Filtro mapeia para `QUITADA` e `ABERTA`; filtro inválido retorna HTTP 400.       | Repositório, serviço e E2E                 | Pendente                                            |
| CT011 | Autenticação                       | Chamar GET, POST, PUT e DELETE sem sessão.                                 | Todas as rotas retornam HTTP 401.                                                | `expenses.e2e-spec.ts`                     | Pendente                                            |
| CT012 | Autorização e recurso indisponível | Simular serviço com acesso proibido e despesa ausente.                     | API retorna HTTP 403 e 404, respectivamente.                                     | `expenses.e2e-spec.ts`                     | Pendente; exceções simuladas pelo mock              |
| CT013 | US004 — fixa ou variável           | Escolher tipo ao cadastrar uma despesa.                                    | Tipo escolhido deve ser persistido e exibido.                                    | Sem teste; a tela não oferece essa escolha | Não implementado                                    |
| CT014 | US004 — rateio por participante    | Cadastrar despesa compartilhada e consultar a parte de cada morador.       | Cada participante vê sua parcela calculada igualmente.                           | Repositório testa persistência e validação das parcelas; sem teste visual | Pendente                                            |
| CT015 | US005 — pagamento individual       | Cada morador marca sua parte como paga.                                    | Data e estado de pagamento são registrados por participante e visíveis ao grupo. | Testes atuais cobrem apenas status geral   | Não implementado                                    |
| CT016 | US005 — conclusão automática       | Pagar todas as parcelas da despesa.                                        | Despesa é concluída quando todos os participantes pagarem.                       | Sem teste de consolidação de parcelas      | Não implementado                                    |
| CT017 | Subgrupo — criação e integrantes   | Criar subgrupo com nome e moradores escolhidos.                             | Apenas moradores ativos da residência são associados.                           | DTO, serviço e repositório unitários        | Pendente                                            |
| CT018 | Subgrupo — autorização de edição   | Tentar editar como criador e como outro morador.                            | Criador pode editar; outro morador recebe HTTP 403.                              | Serviço e repositório unitários             | Pendente                                            |
| CT019 | Subgrupo — alteração de integrantes| Remover e adicionar moradores ativos ao subgrupo.                           | Associação ativa é atualizada; moradores inválidos são rejeitados.               | Repositório unitário                        | Pendente                                            |
| CT020 | Subgrupo — várias despesas         | Vincular energia e internet ao mesmo subgrupo.                              | Cada conta é um registro separado associado ao mesmo subgrupo.                   | Serviço unitário                            | Pendente                                            |
| CT021 | Subgrupo — rateio personalizado    | Informar valores diferentes para os participantes.                         | O rateio é salvo se incluir todos e somar exatamente o total da conta.           | Repositório unitário                        | Pendente                                            |
| CT022 | Subgrupo — rateio inválido         | Omitir participante ou informar soma diferente do total.                    | A criação é rejeitada e as parcelas não são persistidas.                         | Repositório unitário                        | Pendente                                            |

## 4. Testes automatizados encontrados

A organização dos testes de despesas segue a estrutura de testes usada por módulos como a despensa: testes unitários em `backend/test/unit/expenses/` e testes HTTP em `backend/test/`. Os testes web ficam organizados junto às respectivas funcionalidades.

### Backend (NestJS/Vitest)

| Arquivo                                                  | Escopo observado                                                                                                |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `backend/test/unit/expenses/expenses.repository.spec.ts`          | Filtros, histórico, escopo de residência/subgrupo, rateio igual e personalizado, CRUD e exclusão lógica. |
| `backend/test/unit/expenses/expenses.service.spec.ts`             | Regras do CRUD de despesas, acesso à residência/subgrupo e mapeamento das respostas.                    |
| `backend/test/unit/expenses/expenses.subgroups.service.spec.ts`   | Criação, listagem, autorização do criador, validação de integrantes e várias contas por subgrupo.       |
| `backend/test/unit/expenses/expenses.subgroups.repository.spec.ts`| Edição transacional, verificação do criador, integrantes ativos e proteção contra residência inválida.  |
| `backend/test/unit/expenses/create-expense-subgroup.dto.spec.ts`  | Nome obrigatório, tamanho máximo, lista de integrantes e IDs únicos válidos.                             |
| `backend/test/expenses.e2e-spec.ts`                               | Autenticação, CRUD, validações e respostas HTTP 400/401/403/404; serviço mockado.                       |

### Frontend (Next.js/Vitest)

| Arquivo                                                   | Escopo observado                                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `web/app/(private)/finance/__test__/page.test.tsx`        | Cadastro, totalizador, edição, alteração de status, erros e confirmação de exclusão. |
| `web/features/expenses/api/__test__/expenses.api.test.ts` | Chamadas HTTP de listagem, cadastro, atualização e exclusão.                         |

Na revisão foram adicionados os casos de autenticação para todas as operações CRUD, data inexistente, campos obrigatórios e submissão vazia com mensagem amigável. A validação própria da tela usa `noValidate` para impedir que o navegador interrompa o envio antes da exibição dessa mensagem.

## 5. Resultados e comandos de execução

Em 02/11/2026, a suíte unitária do módulo passou com **5 arquivos e 58 testes aprovados**. Os testes unitários não abrem conexão com PostgreSQL. Os resultados E2E e frontend listados abaixo são as execuções registradas em 20/10/2026; eles não foram reexecutados nesta atualização.

### Backend — testes unitários focados em subgrupos

```bash
cd backend
pnpm exec vitest run test/unit/expenses/create-expense-subgroup.dto.spec.ts test/unit/expenses/expenses.subgroups.service.spec.ts test/unit/expenses/expenses.subgroups.repository.spec.ts --reporter=verbose
```

Resultado em 02/11/2026: **3 arquivos e 20 testes aprovados**.

### Backend — testes unitários do módulo

```bash
cd backend
pnpm exec vitest run test/unit/expenses --reporter=verbose
```

Resultado em 02/11/2026: **5 arquivos e 58 testes aprovados**.

### Backend — teste HTTP E2E

```bash
cd backend
pnpm exec vitest run --config ./vitest.config.e2e.ts test/expenses.e2e-spec.ts --reporter=verbose
```

Resultado: **1 arquivo e 8 testes aprovados**. O teste abre uma porta local temporária para o Supertest. O ambiente de sandbox bloqueou essa porta; a execução foi repetida com permissão de rede local.

### Frontend — tela Financeiro e cliente API

```bash
cd web
pnpm exec vitest run 'app/(private)/finance/__test__/page.test.tsx' features/expenses/api/__test__/expenses.api.test.ts --reporter=verbose
```

Resultado: **2 arquivos e 11 testes aprovados**.

Salve a captura do comando focado em subgrupos como `evidencias/subgrupos/testes-backend-unitarios.png`. Salve a captura da suíte completa como `evidencias/despesas/testes-backend-unitarios.png`. A coluna “Resultado manual” permanece pendente porque as capturas são saídas automatizadas, não uma validação visual da interface no navegador.

## 6. Evidências

- `evidencias/despesas/testes-backend-unitarios.png`: capturar novamente com o comando da suíte completa; agora são 5 arquivos e 58 testes.
- `evidencias/subgrupos/testes-backend-unitarios.png`: captura da suíte focada em subgrupos, com 3 arquivos e 20 testes.
- `evidencias/despesas/testes-backend-e2e.png`: evidência anterior de 8 testes HTTP E2E.
- `evidencias/despesas/testes-frontend.png`: evidência anterior de 11 testes da página Financeiro e do cliente API.

## 7. Conclusão

Os testes unitários verificam também criação/edição de subgrupos, autorização exclusiva do criador, seleção de moradores ativos, múltiplas despesas por subgrupo e rateios personalizados válidos e inválidos. As evidências dos novos resultados devem ser capturadas nos caminhos indicados acima.
