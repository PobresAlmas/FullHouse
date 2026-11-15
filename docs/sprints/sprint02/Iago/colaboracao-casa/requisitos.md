# Sprint 02 — Requisitos de colaboração da casa

**Responsável:** Iago  
**Módulos:** Chat da casa, mural de regras e reuniões  
**Requisitos relacionados:** RF011, RF012 e RF013 de `docs/req.pdf`

## 1. Objetivo

Disponibilizar recursos de comunicação e organização para moradores ativos, mantendo o conteúdo isolado por residência e atribuído aos participantes autenticados.

## 2. Requisitos funcionais

- Moradores ativos podem consultar o histórico do chat da residência em ordem cronológica e enviar mensagens não vazias.
- Mensagens mostram autor e data/hora; moradores conectados recebem mensagens novas por SSE e recuperam mensagens após reconexão.
- Moradores ativos podem consultar, criar e editar regras vigentes da residência; o mural identifica criação e última edição.
- Moradores ativos podem agendar reuniões futuras com pauta e convite pendente para cada membro ativo, inclusive o organizador.
- Um convidado ativo pode confirmar ou recusar presença; participantes e respostas ficam visíveis aos membros ativos.
- Somente o organizador pode reagendar ou cancelar uma reunião. O evento anterior permanece no histórico e o substituto recebe novos convites.
- Dados e conexões ao vivo são restritos à residência selecionada e à participação ativa do usuário.

## 3. Critérios de aceitação

1. Usuários sem participação ativa não consultam chat, regras ou reuniões da residência.
2. Mensagens em branco, regras incompletas e reuniões sem pauta ou com data passada são rejeitadas.
3. Regras revogadas ficam fora do mural padrão.
4. Respostas a reuniões só são aceitas do participante convidado e ativo.
5. Reagendamento mantém o evento anterior e cria outro ligado a ele; cancelamento preserva o histórico.

## 4. Rastreabilidade

- Especificação OpenSpec: `openspec/changes/implement-house-collaboration/specs/`.
- Implementação: `docs/sprints/sprint02/Iago/colaboracao-casa/implementacao.md`.
- Testes e comandos: `docs/sprints/sprint02/Iago/colaboracao-casa/testes.md`.
