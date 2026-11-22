# Sprint 02 — Testes da Home

**Responsável:** Emilson<br>
**Módulo:** Home do FullHouse<br>
**Change OpenSpec:** `implement-home-dashboard`

## 1. Objetivo e estado da verificação

As suítes existentes cobrem a criação de residência, os contextos da Home e as métricas. Os testes unitários usam dependências simuladas. Os testes HTTP passam pelo Nest e validam autenticação e contrato com serviços simulados. A criação em um PostgreSQL real pode ser conferida no roteiro manual.

O registro de execução e as capturas desta entrega ficam pendentes até a execução local.

## 2. Matriz de testes funcionais

| ID   | Cenário                        | Resultado esperado                                                                                                                                           | Cobertura relacionada                                                               |
| ---- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| CT01 | Abrir a Home sem residência    | A tela espera a consulta confirmar a ausência de vínculo antes de oferecer a criação.                                                                        | `HomePage.test.tsx`                                                                 |
| CT02 | Criar residência               | Nome válido cria a casa com vínculo `LIDER`. Validação e falha de criação aparecem no formulário.                                                            | `HomePage.test.tsx`, `residences.service.spec.ts`, `residences.e2e-spec.ts`         |
| CT03 | Falha na associação do criador | O erro da inserção do vínculo é propagado na transação simulada.                                                                                             | `residences.service.spec.ts`                                                        |
| CT04 | Consultar painel residencial   | Dados reais da casa aparecem no painel. Falha parcial preserva os cartões carregados e o painel descarta dados da residência anterior ao trocar de contexto. | `HomePage.test.tsx`                                                                 |
| CT05 | Alternar para Pessoal          | A API usa o identificador autenticado e aplica o escopo pessoal. A tela omite a lista de moradores e mantém cartões disponíveis em caso de falha parcial.    | `HomePage.test.tsx`, `home.api.test.ts`, `home.service.spec.ts`, `home.e2e-spec.ts` |
| CT06 | Conferir datas e progresso     | As métricas separam tarefas atrasadas e de hoje, respeitam o fuso e calculam o progresso inclusive quando a semana está vazia.                               | `home-metrics.test.ts`                                                              |

## 3. Arquivos de teste

| Suíte                          | Arquivos                                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend                       | `web/features/home/components/__test__/HomePage.test.tsx`, `web/features/home/api/__test__/home.api.test.ts`, `web/features/home/lib/__test__/home-metrics.test.ts` |
| Backend unitário               | `backend/src/home/home.service.spec.ts`, `backend/src/residences/residences.service.spec.ts`                                                                        |
| Backend HTTP (E2E de contrato) | `backend/test/home.e2e-spec.ts`, `backend/test/residences.e2e-spec.ts`                                                                                              |

## 4. Comandos para executar os testes

Rode os blocos na raiz do FullHouse, pelo PowerShell. Se ainda estiver preparando o ambiente local, siga o [README do projeto](../../../../README.md) para instalar as dependências e gerar o Prisma Client.

### Frontend

```powershell
pnpm.cmd --dir web exec vitest run features/home
```

### Backend unitário

```powershell
pnpm.cmd --dir backend exec vitest run src/home/home.service.spec.ts src/residences/residences.service.spec.ts
```

### Backend HTTP

```powershell
pnpm.cmd --dir backend run test:e2e test/home.e2e-spec.ts test/residences.e2e-spec.ts
```

## 5. Roteiro de teste manual e evidências

Inicie o [ambiente local](../../../../README.md#subir-localmente) e use uma conta de teste sem residência.

| ID   | Passos                                                                                          | Resultado esperado                                                                                                 |
| ---- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| MH01 | Entrar com uma conta sem casa, tentar um nome em branco e criar uma residência com nome válido. | A validação aparece e, após o cadastro válido, o painel mostra a residência criada e o usuário entre os moradores. |
| MH02 | Com tarefas e despesas de teste cadastradas, abrir a Home residencial.                          | Tarefas de hoje, tarefas atrasadas, contas próximas e indicadores correspondem aos dados da casa.                  |
| MH03 | Cadastrar uma tarefa pessoal, alternar para **Pessoal** e voltar à casa.                        | Cada modo mostra os dados do seu contexto. A lista de moradores aparece na visão residencial.                      |
| MH04 | Repetir a alternância em uma janela estreita e navegar pelo formulário usando Tab.              | Os controles mantêm foco visível e os cartões continuam utilizáveis.                                               |

Salve as capturas de terminal em [`evidencias/`](evidencias/) como `testes-front.png`, `testes-backend.png` e `testes-backend-e2e.png`. Para os cenários no navegador, use `home-sem-residencia.png`, `home-residencial.png`, `home-pessoal.png` e `home-mobile.png`.
