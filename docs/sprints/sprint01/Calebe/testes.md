# Sprint 01 — Testes da despensa

**Responsável:** Calebe Mesquita<br>
**Módulo:** Despensa virtual<br>
**Requisitos relacionados:** RF022 — US020

## 1. Objetivo e estado da verificação

Este documento relaciona os critérios da despensa aos testes automatizados do repositório e registra cenários para validação manual.

As suítes automatizadas do módulo foram executadas em 20/10/2026. Os testes manuais da interface não foram executados e permanecem pendentes. A matriz distingue esses cenários dos resultados automatizados registrados na seção 5.

## 2. Critérios de aceitação da US020

Como morador, quero registrar os itens da casa em uma despensa virtual, marcando cada um como comunitário ou privado, para deixar claro o que pode ser consumido por todos.

1. Cada item deve ter nome, dono e indicação de comunitário ou privado.
2. Itens privados devem exibir claramente o nome do morador dono.
3. Deve ser possível informar a data de validade de cada item.

## 3. Matriz de testes funcionais

**Pré-condições sugeridas:** frontend e backend configurados; banco de dados e residência ativa disponíveis; sessão de usuário válida. Usar dados fictícios em capturas e logs.

| ID | Fluxo | Procedimento resumido | Resultado esperado | Cobertura automatizada relacionada | Resultado manual |
|---|---|---|---|---|---|
| CT001 | RF022 / US020 — item comunitário | Cadastrar item com nome, categoria e propriedade comunitária. | Item aparece na lista com tipo comunitário e responsável Casa. | `backend/test/unit/pantry/pantry.service.spec.ts`; rota HTTP em `backend/test/pantry.e2e-spec.ts` | Pendente |
| CT002 | RF022 / US020 — item privado | Cadastrar item privado e consultar com o mesmo usuário. | Item exibe o nome do dono e fica visível para ele. | Mapeamento do responsável em `backend/test/unit/pantry/pantry.service.spec.ts`; visibilidade em `backend/test/unit/pantry/pantry.repository.spec.ts` | Pendente |
| CT003 | RF022 / US020 — privacidade | Consultar ou alterar item privado usando outro membro da residência. | O item não é retornado e não pode ser alterado por outro morador. | `backend/test/unit/pantry/pantry.repository.spec.ts`; `backend/test/unit/pantry/pantry.service.spec.ts` | Pendente |
| CT004 | RF022 / US020 — dono específico | Criar item atribuído a outro membro ativo. | Nome do responsável é exibido; movimentação fica restrita ao dono e o gerenciamento segue as permissões do item. | `backend/test/unit/pantry/pantry.service.spec.ts` | Pendente |
| CT005 | RF022 / US020 — validade | Criar e editar item com data de validade; depois limpar a data. | Data é armazenada e devolvida no formato esperado; também pode ser removida. | `backend/test/unit/pantry/dto/pantry-dto.spec.ts`; `backend/test/unit/pantry/pantry.service.spec.ts` | Pendente |
| CT006 | Busca | Pesquisar pelo nome e pela categoria. | A lista retorna correspondências sem diferenciar maiúsculas e minúsculas. | `backend/test/unit/pantry/pantry.repository.spec.ts`; a rota e a normalização são verificadas em `backend/test/pantry.e2e-spec.ts` | Pendente |
| CT007 | Estoque baixo | Informar quantidade mínima e deixar o saldo igual ou inferior a ela. | A página mostra a indicação de estoque baixo. | Verificação visual; sem caso automatizado específico localizado | Pendente |
| CT008 | Entrada | Registrar uma entrada de estoque. | O saldo aumenta pela quantidade informada. | `backend/test/unit/pantry/pantry.repository.spec.ts`; rota HTTP em `backend/test/pantry.e2e-spec.ts` | Pendente |
| CT009 | Consumo e descarte | Registrar consumo ou descarte dentro do saldo pela API. | A operação é registrada e o saldo diminui. A interface oferece ação de consumo, mas não de descarte. | `backend/test/unit/pantry/pantry.repository.spec.ts`; `backend/test/unit/pantry/pantry.service.spec.ts` | Pendente |
| CT010 | Saída maior que o saldo | Registrar consumo ou descarte acima da quantidade disponível. | Operação é recusada e o saldo não fica negativo. | `backend/test/unit/pantry/pantry.repository.spec.ts` | Pendente |
| CT011 | Validação de quantidade | Informar zero ou quantidade com mais de duas casas decimais. | O formulário ou a API rejeita a quantidade inválida. | `backend/test/unit/pantry/dto/pantry-dto.spec.ts`; `backend/test/pantry.e2e-spec.ts`; `web/app/(private)/pantry/__test__/page.test.tsx` | Pendente |
| CT012 | Sessão e residência | Consultar despensa sem autenticação ou fora de residência ativa. | API bloqueia a chamada ou informa que a residência não está disponível. | `backend/test/pantry.e2e-spec.ts`; `backend/test/unit/pantry/pantry.service.spec.ts` | Pendente |
| CT013 | Unidade após movimentação | Tentar mudar a unidade de item com movimentações existentes. | Alteração é recusada para preservar a consistência do saldo. | `backend/test/unit/pantry/pantry.service.spec.ts` | Pendente |
| CT014 | Remoção | Excluir item sem permissão e depois repetir como criador ou administrador/líder. | Primeira tentativa é bloqueada; a tentativa autorizada remove o item. | `backend/test/unit/pantry/pantry.service.spec.ts`; rota HTTP em `backend/test/pantry.e2e-spec.ts` | Pendente |

## 4. Suítes automatizadas

### Backend (NestJS/Vitest)

| Arquivo | Escopo observado |
|---|---|
| `backend/test/unit/pantry/dto/pantry-dto.spec.ts` | Normalização de texto, conversão numérica, enumerações, UUID, data e quantidade. |
| `backend/test/unit/pantry/pantry.controller.spec.ts` | Guarda JWT, validação, rotas e encaminhamento dos parâmetros ao serviço. |
| `backend/test/unit/pantry/pantry.service.spec.ts` | Associação à residência, propriedade, permissões, validade, movimentações e exclusão. |
| `backend/test/unit/pantry/pantry.repository.spec.ts` | Consultas, visibilidade de itens, agregação de saldo, transações e validação de saídas. |
| `backend/test/pantry.e2e-spec.ts` | Rotas HTTP autenticadas e validação do controller; o serviço está substituído por mock neste teste. |

### Frontend (Next.js/Vitest)

| Arquivo | Escopo observado |
|---|---|
| `web/app/(private)/pantry/__test__/page.test.tsx` | Envio de movimentação decimal e bloqueio de quantidade com mais de duas casas decimais. |

Não foi localizado um arquivo de teste específico para `web/features/pantry/api/pantry.api.ts`.

## 5. Resultados e comandos de execução

As três execuções abaixo passaram em 20/10/2026, totalizando **6 arquivos de teste e 52 testes aprovados**. Os testes HTTP do backend usam serviço mockado e não substituem uma validação integrada com banco de dados.

Backend, testes unitários do módulo — executados com Node 20.19.2:

```bash
cd backend
./node_modules/.bin/vitest run test/unit/pantry
```

Resultado: 4 arquivos e 43 testes aprovados.

Backend, teste HTTP do controller — executado com Node 20.19.2:

```bash
cd backend
./node_modules/.bin/vitest run --config ./vitest.config.e2e.ts test/pantry.e2e-spec.ts
```

Resultado: 1 arquivo e 7 testes aprovados.

Frontend, teste da página — executado com Node 22.23.3:

```bash
cd web
npx --yes --package=node@22 node ./node_modules/vitest/vitest.mjs run 'app/(private)/pantry/__test__/page.test.tsx' --reporter=verbose
```

Resultado: 1 arquivo e 2 testes aprovados. Com o Node 20.19.2 disponível no ambiente, o `jsdom` falhou antes de iniciar os testes (`webidl.util.markAsUncloneable is not a function`); a mesma suíte passou ao executá-la com Node 22.23.3. O uso do Node 22 foi temporário e não alterou as dependências do projeto.

As colunas “Resultado manual” da matriz seguem pendentes porque não foi feita validação manual da interface. As execuções automatizadas não verificam visualmente os filtros, os destaques de validade/estoque baixo nem a experiência completa no navegador.

## 6. Evidências

- `evidencias/testes-backend.png`: resultado dos 43 testes unitários do backend.
- `evidencias/testes-front-1.png`: resultado dos 2 testes da página da despensa.
- `evidencias/testes-backend-e2e.png`: resultado dos 7 testes HTTP do backend.

Ainda não há captura da interface; os cenários manuais permanecem pendentes.
