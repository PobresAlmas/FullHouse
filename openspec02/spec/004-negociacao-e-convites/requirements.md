# SPEC-004 — Negociação de quartos e convites

**Estado:** histórico de interesses, negociação privada, convites e notificações marcados como concluídos no registro original.
**Change de origem:** `room-negotiation-and-invites`.

## Objetivo

Permitir que interessados negociem uma vaga com o anunciante em uma conversa privada. A entrada na residência ocorre mediante um convite separado e aceito pela pessoa destinatária.

## História de usuário

Como pessoa interessada em um quarto, quero acompanhar meu pedido, conversar com o anunciante se ele aceitar o interesse e decidir se quero entrar na residência ao receber o convite.

**Referências do projeto:** [RF015 / US013 no Documento de Especificação de Requisitos](<../../../docs/Documento de Especificação de Requisitos - FullHouse.pdf>) para o contexto de Quartos e [SPEC-001 — Anunciar quarto](../001-anunciar-quarto/requirements.md) para os fluxos de publicação e gestão do anúncio. Os identificadores RF, RNF e CA abaixo são locais à SPEC-004.

## Pré-condições

- Sessão autenticada para consultar interesses, conversar, convidar, responder ou consultar notificações.
- Existência de anúncio e interesse registrado para a vaga. A negociação é habilitada após o aceite do interesse.
- O envio de convite exige que o anunciante seja líder ou administrador da residência anunciada.
- A resposta exige um convite pendente direcionado à conta autenticada.

## Requisitos funcionais

- **RF01 — Acompanhar interesses.** Mostrar à pessoa autenticada somente seus próprios interesses, os anúncios solicitados, seus estados e o acesso às negociações aceitas.
- **RF02 — Decidir sobre o interesse.** Ao aceitar um interesse pendente, registrar `ACEITO`, criar ou recuperar uma única negociação e disponibilizá-la à pessoa interessada. Ao recusar, registrar `RECUSADO` sem abrir uma negociação.
- **RF03 — Conversa privada.** Permitir que apenas anunciante e interessado leiam o histórico e troquem mensagens. O interessado conversa antes de integrar a residência e continua com acesso após aceitar ou recusar um convite.
- **RF04 — Enviar convite.** Permitir que o anunciante com papel de gestão envie, na negociação, um convite pendente para a pessoa exata ligada ao interesse.
- **RF05 — Responder a convite.** Permitir que somente o destinatário aceite ou recuse. O aceite registra `ACEITO` e ativa o vínculo na residência convidante. A recusa registra `RECUSADO`, preservando a residência anterior e o histórico da conversa.
- **RF06 — Notificações.** Registrar avisos internos para a pessoa interessada quando o interesse for aceito e quando o convite for enviado. Mostrar somente os avisos da conta autenticada, com link da conversa ou ações para responder a um convite pendente. Após a resposta, refletir que o convite foi tratado.

## Requisitos não funcionais

- **RNF01 — Privacidade e autorização.** Aplicar no servidor os controles de identidade, participação na negociação, gestão da casa e titularidade do convite em todas as leituras e ações.
- **RNF02 — Integridade.** Processar o aceite do interesse e a criação ou recuperação da negociação em uma transação. Gravar a entrada na casa e o aceite do convite em uma transação, evitando duplicidade em respostas concorrentes.

## Regras de negócio

1. Cada interesse pode ter uma única negociação. Interesses antigos já aceitos podem ganhar uma conversa vazia quando o acesso for solicitado, preservando seu estado.
2. O aceite do interesse inicia a negociação. Reserva de vaga e participação na residência têm fluxos próprios. O estado do convite independe do histórico de mensagens.
3. O convite fica associado à negociação, à casa do anúncio e à pessoa interessada. A conta destinatária é a única autorizada a responder.
4. A conversa permanece restrita aos mesmos dois usuários após o aceite ou a recusa do convite. Ela não integra o chat coletivo da casa ou de subgrupos.

## Caso de uso — Negociar uma vaga e entrar na casa

**Atores:** pessoa interessada, anunciante e, para enviar convite, anunciante com papel de gestão.

**Fluxo principal**

1. O anunciante aceita o interesse pendente. O sistema disponibiliza a conversa aos dois participantes.
2. A pessoa interessada acompanha o estado em Meus interesses ou abre a notificação de aceite. Os participantes podem trocar mensagens em privado.
3. O anunciante com papel de gestão envia o convite da própria negociação. O destinatário recebe uma notificação interna.
4. O destinatário aceita o convite. O sistema registra a entrada como morador da casa do anúncio e mantém a conversa disponível.

**Fluxos alternativos**

- **A1 — Interesse recusado.** O interessado vê a recusa na própria lista, sem uma conversa aberta para aquele pedido.
- **A2 — Convite recusado.** Atualizar o estado do convite, preservar o vínculo atual e manter a conversa disponível.
- **A3 — Acesso ou papel inválido.** Rejeitar a leitura ou a ação. Nenhum convite, vínculo ou mensagem alheia é exposto ou modificado.

## Critérios de aceitação

- **CA01 — Aceitar interesse.** Um aceite cria ou recupera uma única negociação e libera acesso aos dois participantes, sem reservar a vaga ou criar vínculo de morador.
- **CA02 — Recusar e acompanhar.** Uma recusa atualiza o estado sem criar negociação. A lista exibe anúncios e estados dos interesses da conta autenticada.
- **CA03 — Enviar e ler mensagens.** Os dois participantes trocam mensagens privadas. Moradores da casa e contas que não participam da conversa não ganham acesso pelo vínculo com a residência.
- **CA04 — Continuidade.** A pessoa interessada consegue negociar antes de entrar na casa. Aceitar ou recusar o convite preserva a conversa e seu histórico para ambos.
- **CA05 — Enviar convite.** O anunciante gestor cria um convite pendente para a pessoa da negociação e ela recebe um aviso com ações. Um usuário sem papel ou fora da negociação não consegue enviar esse convite.
- **CA06 — Aceitar ou recusar convite.** O destinatário de um convite pendente pode responder. Aceitar vincula a pessoa à casa correta e recusar preserva sua situação de moradia. Uma tentativa de outra conta mantém convite e participação inalterados.
- **CA07 — Notificação de aceite.** Após confirmar o aceite do interesse, o aviso da pessoa interessada aponta para a conversa privada.
- **CA08 — Responder pela notificação.** A ação processa a decisão e a interface deixa de oferecer resposta ao convite tratado.
- **CA09 — Isolamento de avisos.** A lista autenticada mostra apenas notificações da própria conta e suas ações autorizadas.
- **CA10 — Leitura e decisão de convite.** O destinatário pode abrir a negociação pelo cartão ou responder por um botão independente, no sino ou na central, inclusive antes de entrar em uma casa. Marcar a notificação como lida individualmente ou em lote preserva as ações enquanto o convite estiver pendente e válido. [SPEC-003](../003-configuracoes-da-casa/requirements.md#critérios-de-aceitação)

## Fora do escopo

Pagamentos, contratos, reserva garantida, mudanças automáticas no estado do anúncio e entrega externa ou garantida em tempo real no escopo original. A paginação é descrita na [SPEC-005](../005-paginacao-da-negociacao/requirements.md).
