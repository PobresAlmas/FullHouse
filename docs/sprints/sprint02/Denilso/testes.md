# Sprint 02 — Testes do painel de tarefas

**Responsável:** Denilso<br>
**Módulo:** Tarefas e rotina<br>
**Change OpenSpec:** `implement-tasks-dashboard`

## 1. Objetivo e estado da verificação

As suítes cobrem o painel, os contratos HTTP e as regras de tarefas e de troca. Foram acrescentados dois testes de interface para os filtros da residência e o envio de pedido de troca a partir da linha da tarefa.

O registro de execução e as capturas desta entrega ficam pendentes até a execução local. Os testes HTTP usam serviços simulados. A suíte opcional de troca usa PostgreSQL real para conferir a persistência.

## 2. Matriz de testes funcionais

| ID   | Cenário                                   | Resultado esperado                                                                                                                                           | Cobertura relacionada                                                                               |
| ---- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| CT01 | Abrir tarefas sem residência              | A tela consulta as tarefas pessoais e mostra o estado vazio ou os itens da conta.                                                                            | `TasksPage.test.tsx`, `personal-tasks.e2e-spec.ts`                                                  |
| CT02 | Filtrar tarefas da casa                   | **Todas** inclui uma tarefa concluída e os demais filtros selecionam os respectivos exemplos preparados para a suíte.                                        | `TasksPage.test.tsx`                                                                                |
| CT03 | Criar ou concluir tarefa                  | API valida campos e vínculo do responsável. Tarefas concluídas têm o estado atualizado e a recorrência pode gerar a próxima ocorrência.                      | `tasks-validation.spec.ts`, `tasks.service.spec.ts`, `task-completion.spec.ts`, `tasks.e2e-spec.ts` |
| CT04 | Restringir acesso                         | Consulta verifica contexto e visibilidade. Serviço rejeita atribuição inválida e acesso sem vínculo ativo.                                                   | `tasks.repository.spec.ts`, `tasks.service.spec.ts`                                                 |
| CT05 | Solicitar troca pela tarefa               | A ação aparece na tarefa residencial atribuída à pessoa autenticada. Ao escolher um morador e uma sugestão, a tela envia os identificadores correspondentes. | `TasksPage.test.tsx`, `tasks.api.test.ts`, `task-exchange.service.spec.ts`                          |
| CT06 | Aceitar ou recusar uma troca              | Somente o destinatário responde. Aceitar troca os responsáveis e recusar preserva as atribuições.                                                            | `task-exchange.service.spec.ts`, `task-exchange.e2e-spec.ts`                                        |
| CT07 | Reverter falha ou disputar a mesma tarefa | A falha de gravação reverte as duas atribuições. Uma disputa simultânea deixa apenas um pedido pendente para a tarefa.                                       | `task-exchange.integration.test.ts`                                                                 |

## 3. Arquivos de teste

| Suíte                          | Arquivos                                                                                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend                       | `web/features/tasks/components/__test__/`, `web/features/tasks/api/__test__/tasks.api.test.ts`, `web/features/tasks/lib/__test__/tasks.utils.test.ts` |
| Backend unitário               | `backend/src/tasks/**/*.spec.ts`, `backend/test/unit/tasks/*.spec.ts`                                                                                 |
| Backend HTTP (E2E de contrato) | `backend/test/tasks.e2e-spec.ts`, `backend/test/personal-tasks.e2e-spec.ts`, `backend/test/task-exchange.e2e-spec.ts`                                 |
| Integração PostgreSQL          | `backend/test/integration/task-exchange.integration.test.ts`                                                                                          |

## 4. Comandos para executar os testes

Rode os blocos na raiz do FullHouse, pelo PowerShell. Se ainda estiver preparando o ambiente local, siga o [README do projeto](../../../../README.md) para instalar as dependências e gerar o Prisma Client.

### Frontend

```powershell
pnpm.cmd --dir web exec vitest run features/tasks
```

### Backend unitário

```powershell
pnpm.cmd --dir backend exec vitest run src/tasks test/unit/tasks
```

### Backend HTTP

```powershell
pnpm.cmd --dir backend run test:e2e test/tasks.e2e-spec.ts test/personal-tasks.e2e-spec.ts test/task-exchange.e2e-spec.ts
```

### Integração PostgreSQL (opcional)

Use um banco descartável exclusivo para testes, com as migrações aplicadas. A suíte cria registros e instala temporariamente uma restrição para provocar uma falha e conferir a reversão da transação. Sem `TEST_DATABASE_URL`, o Vitest ignora essa suíte.

Em um PowerShell separado, configure `TEST_DATABASE_URL` com a URL do banco de teste e rode os comandos abaixo a partir da raiz. Para um banco de teste novo, a primeira etapa prepara o schema.

```powershell
if (-not $env:TEST_DATABASE_URL) { throw "Configure TEST_DATABASE_URL com o banco de teste." }
$env:DATABASE_URL = $env:TEST_DATABASE_URL
pnpm.cmd --dir backend exec prisma migrate deploy
pnpm.cmd --dir backend exec vitest run --config vitest.config.integration.ts test/integration/task-exchange.integration.test.ts
```

## 5. Roteiro de teste manual e evidências

Inicie o [ambiente local](../../../../README.md#subir-localmente). Para as trocas, use duas contas de teste na mesma residência, cada qual com uma tarefa residencial aberta.

| ID   | Passos                                                                                                       | Resultado esperado                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| MT01 | Criar uma tarefa pessoal, alternar os contextos e recarregar a tela.                                         | A tarefa reaparece no modo Pessoal e fica fora da fila residencial.                                                   |
| MT02 | Preparar tarefas com estados diferentes e alternar **Todas**, **Atrasadas**, **Pendentes** e **Concluídas**. | A aba selecionada é identificada e o painel muda a lista. Conferir também uma tarefa concluída com prazo passado.     |
| MT03 | Criar uma tarefa da casa com responsável, cor e tag. Conferir com uma segunda conta o que é visível.         | A atribuição e as tags aparecem na lista. Tarefas privadas respeitam as regras de acesso.                             |
| MT04 | Solicitar a troca, entrar com a conta destinatária e aceitar escolhendo a tarefa de retorno.                 | Os dois responsáveis mudam depois da aceitação. Para outro pedido, recusar e conferir que os responsáveis permanecem. |
| MT05 | Abrir o painel em janela estreita e usar Tab para alcançar os filtros, o formulário e o menu de conta.       | Os controles mantêm o foco visível e continuam utilizáveis.                                                           |

Salve as capturas de terminal em [`evidencias/`](evidencias/) como `testes-front.png`, `testes-backend.png`, `testes-backend-e2e.png` e, se rodar a integração, `testes-integracao-postgres.png`. Para os cenários de navegador, use `tarefas-contextos.png`, `tarefas-filtros.png`, `tarefas-troca.png` e `tarefas-mobile.png`.
