# Sprint 01 — Requisitos

**Responsável:** Denilso  
**Módulo documentado:** tarefas e organização pessoal  
**Requisitos relacionados:** RF004, RF007, RF008, RF009, RF010 e RF018

As histórias foram relacionadas ao Documento de Especificação de Requisitos em `docs/req.pdf`. Esta entrega implementa somente comportamentos da área de tarefas. Os critérios que dependem de notificações e de despesas/finanças são registrados como pendentes para a respectiva área.

| Requisito | História | Resultado no escopo de tarefas |
| --- | --- | --- |
| RF004 | US003 — cadastro de tarefas | Atendido: periodicidade, prazo, rodízio e cor. |
| RF007 | US006 — conclusão de tarefa | Atendido: validação de responsável/líder/administrador, registro de data/hora e indicação de atraso. |
| RF008 | US007 — lembretes e comprovantes | Parcial: o lembrete da tarefa pode ser configurado e persistido; o disparo/central de notificações e comprovantes de despesas ficam fora desta implementação. |
| RF009 / RF010 | US008 — calendário | Parcial: calendário de tarefas com dia, semana e mês; vencimentos de despesas dependem da área financeira. |
| RF018 | US016 — organização individual | Parcial: tarefas pessoais são separadas por usuário e ficam no navegador; despesas individuais pertencem à área financeira. |

## US003 — Cadastrar tarefas domésticas

**Cartão:** Como administrador, quero cadastrar tarefas definindo periodicidade, rodízio, prazo e uma cor de identificação, para que as atividades da casa fiquem organizadas e fáceis de reconhecer.

**Critérios de aceitação:** informar nome, periodicidade (diária, semanal, quinzenal ou mensal) e prazo; alternar responsável em tarefas recorrentes configuradas para rodízio; mostrar a cor selecionada na tarefa e no calendário.

**Conferência no código:** formulário e DTOs aceitam prazo, frequência, tipo de atribuição, membros do rodízio e cor. A fila é persistida em `fila_rodizio`; ao concluir uma ocorrência recorrente, a próxima recebe o próximo membro. A cor aparece na lista e no calendário.

**Resultado:** atendida no módulo de tarefas.

## US006 — Concluir tarefa

**Cartão:** Como morador, quero marcar uma tarefa como concluída, para que o grupo saiba que ela foi realizada.

**Critérios de aceitação:** somente responsável ou administrador conclui; a conclusão registra data/hora; tarefas não concluídas após o prazo aparecem atrasadas.

**Conferência no código:** serviço valida participação ativa; permite concluir ao responsável ou a membro com papel `LIDER` ou `ADMINISTRADOR`. A ocorrência guarda `concluida_em` e a participação autora. Tarefas pendentes/em andamento vencidas são apresentadas como atrasadas, sem alterar o status salvo no banco.

**Resultado:** atendida no módulo de tarefas.

## US007 — Lembretes e comprovantes

**Cartão:** Como morador, quero criar lembretes para tarefas e despesas e anexar comprovante à despesa paga, para não esquecer prazos e comprovar o pagamento.

**Critérios de aceitação:** configurar data/hora do lembrete; anexar imagem ou PDF à despesa; restringir acesso ao comprovante a membros autorizados.

**Conferência no código:** no escopo de tarefas, o formulário calcula e salva o horário do lembrete em `lembrete`. O disparo e a central de notificações não foram implementados nesta entrega. Upload e controle de acesso de comprovantes são responsabilidade da área financeira.

**Resultado:** parcialmente atendida; persistir o lembrete não significa que um alerta será exibido.

## US008 — Calendário

**Cartão:** Como morador, quero visualizar minhas tarefas diárias, semanais e mensais e as datas de vencimento das contas do grupo, para organizar minha rotina.

**Critérios de aceitação:** alternar dia, semana e mês; distinguir tarefas atribuídas ao morador; consultar tarefas na data selecionada e vencimentos das contas.

**Conferência no código:** o calendário de tarefas permite visões de dia, semana e mês e mostra tarefas da data selecionada, com marcadores para tarefa e atraso. A integração com vencimentos de despesas não foi incluída porque pertence à área financeira.

**Resultado:** parcialmente atendida no módulo de tarefas.

## US016 — Organização pessoal

**Cartão:** Como usuário, quero cadastrar tarefas e despesas individuais mesmo sem participar de um grupo, para usar o sistema na minha organização pessoal.

**Critérios de aceitação:** criar, editar e concluir itens individuais sem casa; manter privacidade; separar itens individuais dos itens da casa.

**Conferência no código:** tarefas pessoais podem ser criadas, editadas e concluídas sem residência. São armazenadas no `localStorage` com chave `fullhouse:personal-tasks:<userId>` e separadas das tarefas da casa pela seleção de escopo. Essa persistência não sincroniza entre dispositivos. Despesas individuais não fazem parte desta implementação.

**Resultado:** parcialmente atendida no módulo de tarefas.

## Limite desta entrega

Não foram adicionados serviços/endpoints de notificações, alterações ao módulo financeiro, upload de comprovantes ou integração de despesas ao calendário de tarefas. Os testes manuais de escopo estão listados em `testes.md`.
