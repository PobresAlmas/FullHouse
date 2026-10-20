# Sprint 01 — Implementação

**Responsável:** Iago<br>
**Módulo principal:** Gestão de despesas na tela Financeiro<br>
**Requisitos relacionados:** RF005 — US004; RF006 — US005 (parcial)

## 1. Visão geral

O módulo permite cadastrar, consultar, editar e excluir logicamente despesas. A interface Next.js consome uma API NestJS protegida por autenticação JWT. O backend associa cada despesa a uma residência ativa do usuário; não é necessário informar a casa no formulário. O vínculo com subgrupo é opcional, conforme o escopo definido para o CRUD.

Esta documentação descreve os arquivos e comportamentos encontrados no repositório. A cobertura dos critérios de aceitação e as limitações estão registradas na matriz de `testes.md`.

## 2. Frontend

A página Financeiro está implementada em `web/app/(private)/finance/page.tsx` e usa os contratos e chamadas de `web/features/expenses/api/expenses.api.ts`.

Na tela, o usuário pode consultar despesas, visualizar o total dos valores listados, abrir os modais para cadastrar e editar, alterar o status geral entre Pendente e Pago e confirmar a exclusão. O formulário verifica descrição, valor e data e apresenta mensagens de erro. O subgrupo/categoria pode ficar sem seleção.

Os testes de tela e do cliente HTTP estão em:

- `web/app/(private)/finance/__test__/page.test.tsx`;
- `web/features/expenses/api/__test__/expenses.api.test.ts`.

A tela não oferece seleção de despesa fixa ou variável. A indicação de categoria apresentada no formulário está associada ao subgrupo; não há um cadastro independente de categorias neste fluxo.

## 3. Backend

O módulo está organizado em `backend/src/expenses/`:

| Arquivo | Responsabilidade |
|---|---|
| `expenses.module.ts` | Registra controller, serviço, repositório e Prisma. |
| `expenses.controller.ts` | Define rotas autenticadas e valida parâmetros e dados recebidos. |
| `expenses.service.ts` | Aplica regras de acesso à residência/subgrupo, operações CRUD e mapeamento da resposta. |
| `expenses.repository.ts` | Consulta e persiste despesas com Prisma. |
| `dto/create-expense.dto.ts` | Valida descrição, valor positivo, data, status e identificadores opcionais. |
| `dto/update-expense.dto.ts` | Reutiliza as validações da criação na atualização. |
| `expenses.service.spec.ts` | Testa regras do serviço e operações CRUD. |
| `expenses.repository.spec.ts` | Testa filtros e escopo de residência/subgrupo nas consultas. |

O teste HTTP está em `backend/test/expenses.e2e-spec.ts`. Ele verifica autenticação, validação de entrada e respostas do controller; o serviço é substituído por mock, portanto não executa persistência real no banco.

### 3.1. Endpoints identificados

Todas as rotas exigem autenticação JWT.

| Método | Rota | Função |
|---|---|---|
| `GET` | `/expenses` | Lista despesas visíveis; aceita `paymentStatus=PENDING` ou `PAID`. |
| `GET` | `/expenses/homes` | Lista residências disponíveis ao usuário. |
| `GET` | `/expenses/subgroups` | Lista subgrupos acessíveis. |
| `POST` | `/expenses` | Cria despesa associada a uma residência ativa; o subgrupo pode ser nulo. |
| `PUT` | `/expenses/:id` | Atualiza dados ou status geral de pagamento. |
| `DELETE` | `/expenses/:id` | Marca a despesa como cancelada, preservando o histórico. |

### 3.2. Regras de negócio identificadas

- A consulta exige participação ativa na residência e, quando a despesa pertence a um subgrupo, participação ativa nesse subgrupo.
- A listagem ordena pela data de vencimento decrescente e usa o identificador como desempate.
- Os filtros públicos Paga/Pendente correspondem aos status persistidos `QUITADA`/`ABERTA`; despesas canceladas não aparecem na listagem sem filtro.
- O DTO rejeita descrição vazia, valor menor ou igual a zero, data inválida e status não reconhecido.
- O valor é persistido como decimal. O totalizador da tela soma os valores exibidos.
- A criação grava `tipo: VARIAVEL` e `estrategia_rateio: IGUALITARIO`. O fluxo registra status geral e, quando paga, uma participação e data de quitação.

### 3.3. Persistência e limites

O modelo `despesa`, definido em `backend/prisma/schema.prisma`, guarda residência, subgrupo opcional, descrição, valor, vencimento, tipo, estratégia de rateio, status e dados gerais de quitação.

A gravação da estratégia igualitária não corresponde, por si só, ao cálculo e à exibição de parcelas por morador. O modelo/fluxo atual também não mantém um estado de pagamento individual para cada participante. Assim, RF006/US005 está atendido somente no nível do status geral da despesa.

## 4. Rastreabilidade

| Entrega | Critério / enquadramento | Evidência no código |
|---|---|---|
| Cadastro com descrição, valor e vencimento | RF005 / US004 | Formulário, DTO e persistência da despesa. |
| Despesa fixa ou variável | RF005 / US004 | O backend grava sempre `VARIAVEL`; não há escolha na tela. Critério parcial. |
| Rateio igual com valor por participante | RF005 / US004 | Estratégia persistida como `IGUALITARIO`, sem parcelas calculadas/exibidas no fluxo. Critério não atendido ponta a ponta. |
| Acesso dos membros da residência | RF005 / US004 | Consulta escopada por participação ativa; repositório testa a condição Prisma. |
| Status e data de quitação geral | RF006 / US005 (parcial) | Edição muda o status geral e guarda data/participação associada. |
| Visão de pagamento de cada morador e conclusão automática | RF006 / US005 | Não há parcelas individuais nem agregação de quitações. Não implementado. |
| Listagem, edição, exclusão lógica, filtro e totalizador | Escopo da tela Financeiro | API, página e testes do módulo. |

O detalhamento dos cenários cobertos, não cobertos e dos resultados executados está em `testes.md`.
