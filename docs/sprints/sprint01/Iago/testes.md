# Sprint 01 — Testes funcionais e evidências

**Responsável:** Iago<br>
**Módulo:** Gestão de despesas (tela Financeiro)<br>
**Requisitos relacionados:** RF005 — US004; RF006 — US005 (parcial)<br>
**Base documental:** Documento de Especificação de Requisitos do FullHouse, RF005/RF006 — US004/US005.

## 1. Objetivo e escopo

Verificar os testes automatizados do CRUD de despesas, comparar sua organização com os demais módulos e relacionar a cobertura aos critérios de aceitação de US004 e US005.

Os testes unitários, HTTP E2E e web foram executados em 20/10/2026. O E2E inicializa o controller HTTP, mas substitui `ExpensesService` por mock. Os testes do repositório inspecionam a consulta Prisma construída; nenhum desses casos executa uma integração com banco de dados real.

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
| CT014 | US004 — rateio por participante    | Cadastrar despesa compartilhada e consultar a parte de cada morador.       | Cada participante vê sua parcela calculada igualmente.                           | Sem teste de parcelas individuais          | Não implementado                                    |
| CT015 | US005 — pagamento individual       | Cada morador marca sua parte como paga.                                    | Data e estado de pagamento são registrados por participante e visíveis ao grupo. | Testes atuais cobrem apenas status geral   | Não implementado                                    |
| CT016 | US005 — conclusão automática       | Pagar todas as parcelas da despesa.                                        | Despesa é concluída quando todos os participantes pagarem.                       | Sem teste de consolidação de parcelas      | Não implementado                                    |

## 4. Testes automatizados encontrados

A organização dos testes de despesas segue a estrutura de testes usada por módulos como a despensa: testes unitários em `backend/test/unit/expenses/` e testes HTTP em `backend/test/`. Os testes web ficam organizados junto às respectivas funcionalidades.

### Backend (NestJS/Vitest)

| Arquivo                                                  | Escopo observado                                                                                                |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `backend/test/unit/expenses/expenses.repository.spec.ts` | Participação ativa, filtro Pago/Pendente, ordenação histórica, acesso por subgrupo, gravação e exclusão lógica. |
| `backend/test/unit/expenses/expenses.service.spec.ts`    | CRUD, acesso a residência/subgrupo, subgrupo opcional, filtros e mapeamento das respostas.                      |
| `backend/test/expenses.e2e-spec.ts`                      | Autenticação, rotas CRUD, validação de campos/valor/data e respostas HTTP 400/401/403/404; serviço mockado.     |

### Frontend (Next.js/Vitest)

| Arquivo                                                   | Escopo observado                                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `web/app/(private)/finance/__test__/page.test.tsx`        | Cadastro, totalizador, edição, alteração de status, erros e confirmação de exclusão. |
| `web/features/expenses/api/__test__/expenses.api.test.ts` | Chamadas HTTP de listagem, cadastro, atualização e exclusão.                         |

Na revisão foram adicionados os casos de autenticação para todas as operações CRUD, data inexistente, campos obrigatórios e submissão vazia com mensagem amigável. A validação própria da tela usa `noValidate` para impedir que o navegador interrompa o envio antes da exibição dessa mensagem.

## 5. Resultados e comandos de execução

As suítes abaixo passaram em 20/10/2026, totalizando **5 arquivos e 38 testes aprovados** após a ampliação da cobertura unitária. Os casos automatizados não cobrem os critérios ainda não implementados de classificação fixa/variável, rateio por morador e conclusão de pagamentos individuais.

### Backend — testes unitários do módulo

```bash
cd backend
pnpm exec vitest run test/unit/expenses --reporter=verbose
```

Resultado atualizado: **2 arquivos e 19 testes aprovados**.

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

As saídas das execuções podem ser comparadas às capturas incluídas em `evidencias/`. A coluna “Resultado manual” permanece pendente porque as imagens registram saídas de testes automatizados, não uma validação manual da interface no navegador.

## 6. Evidências

- `evidencias/testes-backend-unitarios.png`: saída da suíte unitária atual, com 2 arquivos e 19 testes aprovados.
- `evidencias/testes-backend-e2e.png`: 8 testes HTTP E2E.
- `evidencias/testes-frontend.png`: 11 testes da página Financeiro e do cliente API.

## 7. Conclusão

Os testes automatizados existentes verificam as operações principais do CRUD, validações, autenticação, filtros, ordenação, escopo de acesso à residência, totalizador e ações da interface. As evidências incluídas registram a aprovação das suítes executadas.
