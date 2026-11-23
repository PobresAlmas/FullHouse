# Sprint 03 — Requisitos de colaboração da casa

**Responsável:** Iago<br>
**Módulo:** Chat da casa, mural de regras e reuniões<br>
**OpenSpec:** [SPEC-002 — Colaboração da casa](../../../../openspec02/spec/002-colaboracao-da-casa/requirements.md)<br>
**Requisitos relacionados:** RF011, RF012 e RF013 dos [requisitos do projeto](../../../req.pdf)

## 1. Objetivo

Disponibilizar ferramentas para comunicação e organização dos moradores, com acesso vinculado à participação ativa na residência.

## 2. Requisitos funcionais

| Requisito do projeto    | Referência na SPEC-002 | Comportamento                                                                                                                                                                                                                                  |
| ----------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF011 — Chat da casa    | RF01–RF03              | Moradores ativos consultam o histórico cronológico, enviam mensagens não vazias e recebem mensagens novas por SSE. Cada mensagem identifica autor e horário. Após reconectar, o cliente recupera o intervalo desde a última mensagem recebida. |
| RF012 — Mural de regras | RF04–RF05              | Moradores ativos consultam regras vigentes. Líderes e administradores com vínculo ativo cadastram ou editam, com registro de autoria e da última edição.                                                                                       |
| RF013 — Reuniões        | RF06–RF08              | Moradores ativos agendam reuniões futuras com pauta. Os convidados ativos respondem à presença e os moradores consultam as respostas. O organizador pode reagendar ou cancelar, preservando o histórico.                                       |

## 3. Critérios de aceitação

1. Rejeitar mensagens em branco, regras incompletas e reuniões sem pauta ou com data passada.
2. Restringir chat, regras e reuniões à residência autorizada. Encerrar o SSE do chat após a revogação do vínculo.
3. Mostrar regras vigentes na listagem padrão. Exigir gestão para escrever no mural.
4. Aceitar resposta de presença somente do participante convidado e ativo.
5. Exigir o organizador para cancelar ou reagendar. Preservar a reunião anterior e vincular a nova quando houver reagendamento.

A RF05 da SPEC-002 descreve escrita por morador ativo. O [serviço de regras nesta branch](../../../../backend/src/house-rules/house-rules.service.ts) exige papel de gestão para cadastrar e editar, conforme o comportamento registrado acima.

## 4. Rastreabilidade

- [Implementação](implementacao.md) e [testes e evidências](testes.md) da Sprint 03.
- [Registro anterior da colaboração na Sprint 02](../../sprint02/Iago/colaboracao-casa/requisitos.md).
- A [SPEC-004 — Negociação de quartos e convites](../../../../openspec02/spec/004-negociacao-e-convites/requirements.md) trata da conversa privada de uma vaga e do convite para entrar na casa. A [SPEC-005 — Paginação da negociação](../../../../openspec02/spec/005-paginacao-da-negociacao/requirements.md) trata do histórico dessa conversa. A implementação original de ambas foi registrada por Emilson no commit `0cbc602`.
