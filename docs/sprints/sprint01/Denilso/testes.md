# Sprint 01 — Testes e evidências

**Responsável:** Denilso  
**Histórias:** US003, US006, US007 (parcial), US008 (parcial) e US016 (tarefas)

## Estado da verificação

Os testes automatizados de tarefas no backend foram executados: unitários 13/13 aprovados e e2e 5/5 aprovados quando o processo pôde abrir um servidor local. Em ambientes restritos, o e2e pode falhar com `listen EPERM` porque precisa escutar temporariamente em `127.0.0.1`. A suíte automatizada do frontend também foi executada e passou, conforme informado; o total de testes não foi registrado aqui. Essa suíte não possui testes específicos para `TasksPage` ou para os fluxos de tarefas desta entrega. Os cenários manuais abaixo ainda estão pendentes. `backend pnpm build` e `web ./node_modules/.bin/tsc --noEmit` também passaram.

## Preparar ambiente

Na raiz `FullHouse/`, em terminais separados:

1. Inicie os serviços locais: `docker compose up -d`.
2. Gere o cliente Prisma e aplique as migrações existentes: `cd backend && pnpm exec prisma generate && pnpm exec prisma migrate deploy`.
3. Tenha usuário autenticado e uma residência ativa com administrador e ao menos dois moradores. Para tarefa pessoal, use também o escopo Pessoal.
4. Inicie o backend: `cd backend && pnpm start:dev`.
5. Em outro terminal, inicie o frontend: `cd web && pnpm dev`; abra o endereço informado pelo Next e entre com usuário de teste.

## Roteiro de validação e capturas

| ID | História / cenário | Passos e resultado esperado | Captura sugerida | Resultado |
| --- | --- | --- | --- | --- |
| CT01 | US003 — periodicidade, cor e rodízio | Em Tarefas > Casa, crie tarefa recorrente, escolha cor e Rodízio com pelo menos dois moradores. A tarefa deve exibir cor e responsável inicial. Conclua como responsável; a próxima ocorrência deve alternar o responsável. | Formulário, tarefa criada e ocorrência seguinte. | Pendente |
| CT02 | US003 — validação do rodízio | Tente salvar rodízio com menos de dois moradores. A API deve rejeitar e informar a regra. | Mensagem de validação. | Pendente |
| CT03 | US006 — conclusão permitida | Como responsável, conclua uma tarefa; repita como administrador em outra. Deve registrar conclusão. | Tarefa antes/depois da conclusão. | Pendente |
| CT04 | US006 — permissão e atraso | Como membro não responsável, tente concluir: API deve rejeitar. Deixe tarefa não concluída após o prazo: deve aparecer atrasada. | Erro de autorização e indicação de atraso. | Pendente |
| CT05 | US007 — lembrete configurado | Crie tarefa com lembrete de alguns minutos antes do prazo. Edite a tarefa e confira se horário/minutos configurados permanecem. Este fluxo apenas persiste o lembrete; não há alerta disparado nesta entrega. | Formulário com lembrete e tarefa salva. | Pendente |
| CT06 | US008 — calendário | Alterne Dia, Semana e Mês e selecione datas que tenham tarefas. Deve mostrar as tarefas previstas e marcar atrasos. | Captura de cada visão e detalhe de uma data. | Pendente |
| CT07 | US016 — tarefa pessoal | No escopo Pessoal, crie, edite e conclua tarefa sem residência. Atualize a página no mesmo navegador: a tarefa deve continuar salva. No escopo Casa, a tarefa pessoal não deve aparecer. | Lista pessoal após atualização e lista Casa separada. | Pendente |
| CT08 | US016 — separação por usuário | Faça login com outra conta no mesmo navegador e abra o escopo Pessoal. As tarefas da conta anterior não devem aparecer. | Escopo pessoal sem os dados da outra conta. | Pendente |

**Capturas:** salve imagens sem dados sensíveis em `docs/sprints/sprint01/Denilso/evidencias/`, com nomes como `CT01-rodizio.png`. Substitua “Pendente” pelo resultado observado e inclua o caminho da imagem na linha.

## Testes automatizados encontrados

| Arquivo | Abrangência conhecida |
| --- | --- |
| `backend/test/unit/tasks/tasks.service.spec.ts` | Serviço de tarefas, associação à residência, validações, lembrete, conclusão e remoção. |
| `backend/test/tasks.e2e-spec.ts` | Rotas autenticadas e validação HTTP; o serviço é simulado, não valida persistência real. |

Não foram localizados testes de interface para rodízio, calendário ou armazenamento local de tarefas pessoais.

## Comandos de validação

O projeto declara Node.js 26.8.1 e pnpm 11.22.0 em `devbox.json`. Use o ambiente configurado para repetir os comandos. Confira as versões efetivas com:

```bash
cd FullHouse
devbox shell
node -v
pnpm -v
```

O `devbox.json` fixa Node.js 26.8.1; registre a versão usada na execução, pois o frontend depende do `jsdom` 30.

Depois, para os testes automatizados relacionados a tarefas no backend:

```bash
cd backend
pnpm exec vitest run test/unit/tasks/tasks.service.spec.ts
pnpm exec vitest run --config ./vitest.config.e2e.ts test/tasks.e2e-spec.ts
```

O primeiro roda os testes unitários das regras do serviço. O segundo roda os testes HTTP do controller; eles usam `TasksService` simulado e não acessam banco de dados. Para rodar a suíte completa do backend, use `pnpm test` (unitários) e `pnpm test:e2e` (e2e), ainda dentro de `backend/`.

No frontend, não há testes automatizados específicos para `TasksPage` no momento. Para rodar toda a suíte existente do frontend (que cobre outras áreas do sistema):

```bash
cd web
pnpm exec vitest run
```

Para conferir tipos sem rodar a suíte: `cd web && ./node_modules/.bin/tsc --noEmit`. Para compilar o backend: `cd backend && pnpm build`.

Registre data, comando e resultado real após executar. Compilação não substitui os cenários funcionais nem as capturas.
