# Sprint 03 — Requisitos de negociação e convites

**Responsável:** Emilson<br>
**Módulo:** Quartos — interesses, conversa e convite residencial<br>
**OpenSpec:** [SPEC-004](../../../../../openspec02/spec/004-negociacao-e-convites/requirements.md)

## 1. Objetivo

Permitir que anunciante e interessado conversem em privado após o aceite do interesse. O anunciante com papel de gestão pode convidar a pessoa interessada para a casa, e a entrada depende da resposta do destinatário.

## 2. Requisitos funcionais

| Referência | Comportamento                                                                                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF01–RF02  | **Meus interesses** lista apenas pedidos da conta. Aceitar cria ou recupera uma negociação para aquele pedido. Recusar registra a decisão.                            |
| RF03       | Apenas as duas contas da negociação consultam o histórico e enviam mensagens.                                                                                         |
| RF04–RF05  | O anunciante gestor envia o convite à conta da negociação. Somente o destinatário decide. Aceitar registra a entrada como morador e recusar preserva o vínculo atual. |
| RF06       | Avisos internos informam sobre o aceite ou o convite. As ações para responder aparecem enquanto o convite estiver pendente e válido.                                  |

## 3. Critérios de aceitação

1. O interessado vê o estado do pedido na própria conta. O aceite abre a conversa para as duas partes.
2. Outra conta recebe acesso negado à conversa, mesmo que resida na mesma casa do anunciante.
3. Convite válido pode ser aceito ou recusado exclusivamente pelo destinatário. Aceitar ativa um vínculo na casa correta.
4. A notificação de aceite abre a negociação. O convite tratado deixa de oferecer ações de resposta.

## 4. Rastreabilidade

- RF015/US013 contextualiza a procura de quartos e a privacidade de endereço e contato. RN001, RN002 e RF023/US021 orientam as restrições de acesso e gestão. A SPEC-004 detalha a negociação e o convite. [Documento de Especificação de Requisitos — FullHouse](<../../../../../docs/Documento de Especificação de Requisitos - FullHouse.pdf>)
- [Implementação](implementacao.md), [testes e evidências](testes.md) e [tarefas da SPEC-004](../../../../../openspec02/spec/004-negociacao-e-convites/tasks.md).
- [Paginação da negociação](../paginacao-da-negociacao/requisitos.md) e [publicação em Moradores](../../Denilso/requisitos.md).
