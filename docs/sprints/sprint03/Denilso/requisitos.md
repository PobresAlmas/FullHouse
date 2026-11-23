# Sprint 03 — Requisitos de Anunciar quarto

**Responsável:** Denilso<br>
**Módulo:** Quartos — publicação e gestão de anúncios em Moradores<br>
**OpenSpec:** [SPEC-001 — Anunciar quarto](../../../../openspec02/spec/001-anunciar-quarto/requirements.md)<br>
**Requisito relacionado:** RF015 / US013 do projeto

## 1. Objetivo

Permitir que a gestão anuncie um quarto pela aba **Configurações → Moradores**. Quem procura moradia pode consultar o anúncio e manifestar interesse. O anunciante pode revisar o card, editar os dados e acompanhar as solicitações.

## 2. Requisitos funcionais

| Referência na SPEC-001                | Comportamento                                                                                                                                                                                            |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF01–RF02 — Acesso e dados            | Líder ou administrador da casa ativa abre **Anunciar quarto** no cabeçalho de Moradores. O formulário identifica a casa e valida título, descrição, preço, cidade e contato.                             |
| RF03 — Fotos                          | Adicionar, visualizar ou remover até oito imagens JPEG, PNG ou WebP de até 8 MiB cada. A seleção é opcional.                                                                                             |
| RF04–RF05 — Convivência e privacidade | Selecionar regras vigentes, revisar o texto público de convivência e informar se aceita pets. O anunciante escolhe separadamente a visibilidade do endereço completo e do contato.                       |
| RF06–RF07 — Publicação e gestão       | Publicar como `ABERTO`, confirmar o resultado em Moradores e exibir o anúncio em **Anúncios da casa** com o mesmo card da busca de Quartos. O anunciante pode editar e preservar as fotos selecionadas.  |
| RF08–RF09 — Interesse e aviso         | Consultar e responder aos interessados do próprio anúncio. Um novo interesse válido gera aviso com destino à área de interessados. Solicitação duplicada pendente ou aceita mantém o registro existente. |
| RF10 — Convite e entrada              | A conversa oferece o convite à pessoa destinatária. Aceitar pelo sino ou pela conversa atualiza a participação e a situação de moradia e abre a Home da casa. Recusar preserva a situação anterior.      |

## 3. Critérios de aceitação

1. A ação de publicação aparece para gestores da casa ativa. A API rejeita publicação ou envio de fotos sem a autorização da casa informada.
2. O formulário aceita uma publicação sem fotos e mantém os dados válidos após falha de envio. Sua abertura e seu fechamento oferecem foco utilizável por teclado.
3. O anúncio guarda o texto revisado de convivência e a opção de pets. A consulta pública respeita as escolhas de endereço e contato.
4. O card em Moradores permite prévia e mostra a autoria. Alterações e decisões de interesse exigem o anunciante autorizado.
5. O aviso de interesse abre o anúncio e a área de interessados em Moradores. O aceite de um interesse disponibiliza a conversa.
6. O aceite do convite confirma a entrada como `MORADOR` e exibe a casa na tela inicial. Convite recusado ou inválido mantém a situação de moradia anterior.

## 4. Rastreabilidade

- RF015/US013 contextualiza a busca de uma vaga, o perfil de convivência e a divulgação autorizada de endereço e contato. [Documento de Especificação de Requisitos — FullHouse](<../../../../docs/Documento de Especificação de Requisitos - FullHouse.pdf>)
- [Implementação](implementacao.md) e [testes e evidências](testes.md) da Sprint 03.
- [Design](../../../../openspec02/spec/001-anunciar-quarto/design.md) e [tarefas da SPEC-001](../../../../openspec02/spec/001-anunciar-quarto/tasks.md).
- [SPEC-004 — Negociação e convites](../../../../openspec02/spec/004-negociacao-e-convites/requirements.md) e [SPEC-005 — Paginação da negociação](../../../../openspec02/spec/005-paginacao-da-negociacao/requirements.md). A entrega usa a conversa e o convite existentes para concluir o fluxo do anúncio.
- [Contextos da Home e de Tarefas — SPEC-006](contextos-home-tarefas/requisitos.md) é a outra entrega do Denilso nesta sprint.
