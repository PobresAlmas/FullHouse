# Sprint 01 — Implementação

**Responsável:** Denilso  
**Escopo:** tarefas domésticas e organização pessoal

## Arquivos da entrega

| Arquivo | Responsabilidade |
| --- | --- |
| `web/features/tasks/components/TasksPage.tsx` | Interface de tarefas, formulário, filtros, modos Casa/Pessoal e calendário. |
| `web/features/tasks/api/tasks.api.ts` | Tipos e chamadas HTTP de tarefas, moradores e residências. |
| `backend/src/tasks/tasks.controller.ts` | Rotas autenticadas de tarefas. |
| `backend/src/tasks/tasks.service.ts` | Regras de acesso, membros, recorrência, conclusão e mapeamento das tarefas. |
| `backend/src/tasks/tasks.repository.ts` | Persistência de definições, ocorrências e lembretes com Prisma. |
| `backend/src/tasks/dto/create-task.dto.ts` e `update-task.dto.ts` | Validação de prazo, periodicidade, atribuição e cor. |

## Tarefas domésticas

- Criação e edição aceitam prazo, descrição, tags, recorrência, cor e tipo de atribuição.
- O modo FIXA usa um responsável. O modo RODIZIO exige pelo menos dois membros ativos e persiste a sequência em `fila_rodizio`.
- Ao concluir tarefa recorrente, o backend cria a próxima ocorrência e avança para o próximo responsável.
- A conclusão só é permitida ao responsável atual ou a usuário com papel `LIDER`/`ADMINISTRADOR`. A ocorrência registra data/hora e participação autora.
- Tarefas pendentes ou em andamento vencidas são mapeadas como atrasadas na resposta da API.
- Lembrete da tarefa é armazenado no modelo Prisma `lembrete`, com horário calculado a partir do prazo e minutos configurados. Esta entrega não contém serviço de disparo ou central de notificações.

## Tarefas pessoais

Tarefas pessoais são mantidas no navegador, na chave `fullhouse:personal-tasks:<userId>`. Podem ser criadas, editadas e concluídas sem residência e aparecem no escopo Pessoal, separado do escopo Casa. Não são enviadas à API nem sincronizadas entre dispositivos.

## Calendário de tarefas

O componente `CalendarWidget` permite visões de dia, semana e mês. Os marcadores e detalhes apresentam tarefas da data selecionada e indicam atrasos. Vencimentos de despesas não são integrados aqui; essa parte pertence ao módulo financeiro.

## Rotas de tarefas

As rotas ficam sob `/residences/:residenceId/tasks` e usam autenticação JWT:

| Método | Rota | Função |
| --- | --- | --- |
| `GET` | `/members` | Lista moradores ativos para atribuição. |
| `GET` | `/` | Lista tarefas com filtros disponíveis. |
| `POST` | `/` | Cria tarefa e, opcionalmente, registra lembrete. |
| `GET` | `/:taskId` | Consulta uma tarefa. |
| `PATCH` | `/:taskId` | Atualiza dados, atribuição, prazo, recorrência ou lembrete. |
| `PATCH` | `/:taskId/complete` | Conclui uma ocorrência e registra autoria/data. |
| `DELETE` | `/:taskId` | Cancela ocorrências da definição. |

## Rastreabilidade

| História | Implementação |
| --- | --- |
| US003 / RF004 | Periodicidade, prazo, rodízio e cor. |
| US006 / RF007 | Regra de permissão, registro de conclusão e sinalização de atraso. |
| US007 / RF008 | Configuração e persistência do horário de lembrete; disparo e comprovantes permanecem fora do escopo. |
| US008 / RF009/RF010 | Calendário dia/semana/mês de tarefas; despesas permanecem fora do escopo. |
| US016 / RF018 | Tarefas pessoais locais, separadas por usuário e por escopo. |
