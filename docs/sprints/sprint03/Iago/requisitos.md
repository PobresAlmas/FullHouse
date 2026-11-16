# Sprint 03 — Requisitos de colaboração da casa

**Responsável:** Iago  
**Módulos:** Chat da casa, mural de regras e reuniões  
**Requisitos relacionados:** RF011, RF012 e RF013 de `docs/req.pdf`

## 1. Objetivo

Disponibilizar ferramentas para comunicação e organização dos moradores, mantendo os dados e as ações restritos aos participantes ativos da residência.

## 2. Requisitos funcionais

### RF011 — Chat da casa

- Moradores ativos podem consultar o histórico de mensagens da residência em ordem cronológica e enviar mensagens não vazias.
- Cada mensagem identifica o autor e a data e hora de envio.
- Mensagens novas são disponibilizadas aos moradores conectados em tempo real; após reconexão, o cliente recupera as mensagens que perdeu.
- Usuários sem participação ativa não podem consultar o histórico nem manter uma conexão de mensagens da residência.

### RF012 — Mural de regras

- Moradores ativos podem consultar as regras vigentes da residência, criar regras e editar regras existentes.
- O mural identifica quem criou e quem editou cada regra pela última vez.
- Regras revogadas não aparecem na listagem padrão.
- Apenas moradores ativos podem acessar e alterar as regras da residência.

### RF013 — Reuniões

- Moradores ativos podem agendar reuniões futuras com pauta e convidar os membros ativos da residência.
- Convidados podem confirmar ou recusar presença; os participantes e suas respostas ficam visíveis aos moradores ativos.
- Somente o organizador pode reagendar ou cancelar uma reunião.
- O reagendamento preserva a reunião anterior no histórico e cria uma nova reunião vinculada a ela.
- O cancelamento preserva o registro da reunião.

## 3. Critérios de aceitação

1. Mensagens em branco, regras sem os dados obrigatórios e reuniões sem pauta ou com data passada são rejeitadas.
2. Dados de chat, regras e reuniões ficam isolados por residência e exigem participação ativa.
3. Uma resposta de presença só é aceita do morador convidado e ativo.
4. Um morador que não seja organizador não consegue reagendar nem cancelar a reunião.
5. Reagendamentos e cancelamentos mantêm o histórico anterior.

## 4. Rastreabilidade

- Especificação e tarefas: `openspec/changes/implement-house-collaboration/`.
- Implementação: `docs/sprints/sprint03/Iago/implementacao.md`.
- Testes e evidências: `docs/sprints/sprint03/Iago/testes.md`.
