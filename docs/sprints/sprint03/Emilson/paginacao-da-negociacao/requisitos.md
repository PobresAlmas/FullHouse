# Sprint 03 — Requisitos de paginação da negociação

**Responsável:** Emilson<br>
**Módulo:** Quartos — histórico da conversa privada<br>
**OpenSpec:** [SPEC-005](../../../../../openspec02/spec/005-paginacao-da-negociacao/requirements.md)

## 1. Objetivo

Abrir uma negociação na mensagem mais recente e permitir ao participante recuperar o histórico por páginas, preservando a posição de leitura.

## 2. Requisitos funcionais

| Referência | Comportamento                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| RF01–RF02  | A primeira consulta carrega até 30 mensagens em ordem cronológica. São aceitos limites de 1 a 50. As demais páginas usam o cursor `before`. |
| RF03       | Carregar mensagens anteriores ao rolar até o início da área ou acionar o botão. Preservar a mensagem que estava visível.                    |
| RF04       | Manter a conversa com rolagem própria, o compositor acessível e a barra lateral visível no desktop.                                         |
| RF05       | Permitir atualizar, enviar mensagens e tentar novamente quando uma página anterior falhar. Evitar a mesma consulta simultânea.              |

## 3. Critérios de aceitação

1. Percorrer uma conversa longa em ordem, sem repetir o item do cursor nem perder mensagens com horário igual.
2. Rejeitar limites e cursores inválidos e pedidos de contas fora da conversa.
3. Inserir histórico antigo acima das mensagens atuais sem deslocar o trecho lido.
4. Manter o conteúdo já carregado quando a próxima página falhar e oferecer nova tentativa.

## 4. Rastreabilidade

- RF015/US013 dá o contexto de Quartos, e RNF003 orienta a responsividade. A SPEC-005 define contrato e rolagem do histórico. [Documento de Especificação de Requisitos — FullHouse](<../../../../../docs/Documento de Especificação de Requisitos - FullHouse.pdf>)
- [Implementação](implementacao.md), [testes e evidências](testes.md), [tarefas da SPEC-005](../../../../../openspec02/spec/005-paginacao-da-negociacao/tasks.md) e [negociação e convites](../negociacao-e-convites/requisitos.md).
