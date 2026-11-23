# SPEC-001 — Anunciar quarto

**Estado:** publicação, gestão de anúncios e interesses implementadas.

## Objetivo

Permitir que líderes e administradores anunciem um quarto para a residência exibida em **Configurações → Moradores**, com descrição, informações de convivência e opção de adicionar fotos. Na mesma aba, moradores consultam os anúncios da casa, e o anunciante pode editar os seus e responder aos interessados.

## História de usuário

Como líder ou administrador de uma residência ativa, quero anunciar um quarto pela aba Moradores e informar como é a convivência, para que quem procura moradia possa avaliar a vaga antes de manifestar interesse.

**Referências do projeto:** [RF015 / US013 no Documento de Especificação de Requisitos](<../../../docs/Documento de Especificação de Requisitos - FullHouse.pdf>) e [regras de publicação, permissões e privacidade da Sprint 02](../../../docs/sprints/sprint02/Willian/requisitos.md). Os identificadores RF, RNF e CA abaixo são locais à SPEC-001.

## Pré-condições

- Sessão autenticada e residência ativa disponível em Configurações.
- Participação ativa com papel `LIDER` ou `ADMINISTRADOR` na residência exibida.
- O FullHouse já oferece publicação, upload de fotos, consulta dos próprios anúncios e mural de regras da casa.

## Requisitos funcionais

- **RF01 — Acesso pela aba Moradores.** Exibir **Anunciar quarto** à direita do cabeçalho **Moradores da casa**, na área indicada na captura. Abrir o formulário para a residência exibida. A ação exige papel de líder ou administrador da casa ativa. A permissão de editar conteúdo da casa, por si só, não habilita a publicação.
- **RF02 — Dados do anúncio.** Pedir título, descrição do quarto, valor mensal positivo em reais, cidade e contato. Preencher cidade e bairro com os dados disponíveis da residência, permitindo ajuste no anúncio. Oferecer tipo de moradia, bairro e endereço completo. O formulário deve identificar a residência de destino e validar os campos antes de publicar.
- **RF03 — Fotos do quarto.** Permitir selecionar, visualizar e remover antes do envio até oito imagens JPEG, PNG ou WebP de até 8 MiB cada. A seleção é opcional. Informar quais arquivos foram rejeitados por formato, tamanho ou quantidade. As fotos incluídas devem abrir para quem consulta o anúncio.
- **RF04 — Convivência e pets.** Exibir as regras vigentes do mural da residência para que o anunciante escolha quais incluir. Permitir revisar e complementar o texto público de convivência, incluindo, por exemplo, visitas, horários de silêncio ou regras sobre fumar. Solicitar a revisão desse texto antes da publicação. Informar **Aceita pets** como Sim ou Não e salvar a escolha em campo próprio.
- **RF05 — Privacidade.** Oferecer opções independentes para exibir endereço completo e contato, ambas desmarcadas inicialmente. A resposta pública deve respeitar essas escolhas. Somente o texto revisado para o anúncio pode incluir trechos do mural. O anúncio não deve exibir autoria, identificadores internos ou dados de moradores a partir desse mural.
- **RF06 — Publicação e retorno.** Publicar um anúncio inicialmente `ABERTO`, vinculado à residência e à participação anunciante identificada no servidor. Exibir o andamento do envio e bloquear cliques adicionais durante a operação. Após confirmação da API, fechar o formulário e confirmar a publicação na aba Moradores. Em caso de erro, manter o formulário e permitir a correção ou nova tentativa.
- **RF07 — Anúncios da casa.** Exibir a seção **Anúncios da casa** abaixo da lista de moradores. Membros ativos consultam os anúncios nos mesmos cards usados na busca de Quartos, com foto de capa, título, localização, valor, situação e características. O painel identifica o autor e oferece detalhes. O anunciante com participação ativa pode editar seus anúncios, preservando as informações e fotos que não remover.
- **RF08 — Pessoas interessadas.** O anunciante pode consultar interessados de seus anúncios e aceitar ou recusar solicitações pendentes. Aceitar abre a possibilidade de conversar pelo fluxo de negociação existente.
- **RF09 — Aviso de novo interesse.** Registrar uma notificação para o anunciante ao receber um novo interesse ou uma nova solicitação após recusa. A notificação aparece no sino e em **Configurações → Notificações** e leva aos interessados do anúncio. Uma tentativa duplicada ainda pendente ou aceita não gera outro aviso.
- **RF10 — Entrada na casa após aceitar o convite.** O interessado recebe um convite que pode responder pelo sino ou na conversa do quarto. O aceite do convite confirma uma participação ativa como morador, atualiza a situação de moradia e leva a pessoa à tela inicial da casa. Recusar mantém sua situação anterior.

## Requisitos não funcionais

- **RNF01 — Interface.** Manter a identidade visual do FullHouse, em português do Brasil, com funcionamento em celular e desktop.
- **RNF02 — Acessibilidade.** Fornecer rótulos, foco visível, navegação por teclado e anúncio dos erros e do resultado da publicação a tecnologias assistivas.
- **RNF03 — Autorização.** Validar no servidor a sessão e a permissão de gestão para publicar e enviar fotos, incluindo tentativas para outra residência. A autorização do mural permanece restrita aos membros ativos da casa.

## Regras de negócio

1. O `casaId` usado no envio corresponde à residência para a qual o formulário foi aberto. A autoria é obtida da sessão e da participação ativa na residência.
2. O anúncio guarda o texto de convivência aprovado no formulário. Alterações no mural depois da publicação não modificam automaticamente o conteúdo publicado.
3. O valor de **Aceita pets** descreve o anúncio. Seu preenchimento não altera as regras nem a configuração de pets da residência.
4. A publicação não cria uma participação de morador, convite ou negociação. Esses fluxos são independentes.
5. O anunciante aceita o interesse para desbloquear a conversa e, se tiver permissão de gestão, envia o convite. A entrada na residência depende do aceite do próprio destinatário. O destino deve ser uma casa ativa e o usuário só pode ter uma participação ativa.

## Caso de uso — Publicar anúncio pela aba Moradores

**Ator:** líder ou administrador com participação ativa na residência.

**Fluxo principal**

1. Abrir **Configurações → Moradores** e selecionar **Anunciar quarto** no cabeçalho do cartão.
2. Conferir a residência de destino, preencher os dados do quarto e selecionar fotos, se desejar.
3. Escolher as regras que deseja incluir, revisar o texto de convivência, informar se aceita pets e definir a visibilidade de endereço e contato.
4. Selecionar **Publicar anúncio**. O sistema valida os dados, envia as fotos selecionadas e publica o anúncio.
5. Após a confirmação, o sistema volta à aba Moradores e apresenta **Anúncio publicado**.

**Fluxos alternativos**

- **A1 — Sem acesso de gestão.** O botão fica indisponível no fluxo. Uma tentativa direta de publicar ou enviar fotos sem autorização é rejeitada pela API.
- **A2 — Mural vazio ou indisponível.** Com o mural vazio, orientar o preenchimento manual do perfil. Em caso de falha na leitura, apresentar uma mensagem e a opção de tentar novamente. O gestor pode informar o perfil manualmente se continuar autorizado a publicar.
- **A3 — Dados ou fotos inválidos.** Indicar o campo ou arquivo afetado e manter os dados válidos. Não publicar até a correção.
- **A4 — Falha de envio.** Manter os campos e a seleção de fotos na tela. Quando uma foto selecionada falhar, não publicar parcialmente. Exibir erro e permitir nova tentativa.
- **A5 — Cancelamento.** Fechar o formulário e retornar ao cabeçalho de Moradores sem criar anúncio.

## Critérios de aceitação

- **CA01 — Posição e disponibilidade.** Líder e administrador veem a ação no cabeçalho de Moradores, no canto direito em telas largas, inclusive se a lista estiver vazia. Morador comum, pessoa sem residência ativa e quem perdeu a participação não conseguem iniciar o fluxo autorizado. As abas Casa e Permissões não exibem essa ação.
- **CA02 — Dados e vínculo.** A residência de destino está identificada e é a mesma usada para enviar fotos e publicar. Título, descrição, cidade, contato ou texto de convivência em branco e valor inválido impedem a publicação. Dados opcionais ausentes não impedem o preenchimento.
- **CA03 — Fotos.** É possível incluir e remover imagens válidas antes de enviar. Arquivo incompatível ou maior que 8 MiB e seleção acima de oito recebem mensagem e não são enviados. O anúncio confirmado contém somente as fotos selecionadas, e as URLs dessas fotos podem ser abertas sem sessão. A publicação também funciona sem fotos.
- **CA04 — Regras e pets.** Somente regras selecionadas da residência de destino podem ser copiadas do mural. O anúncio guarda o texto final revisado e o valor booleano escolhido para pets. Mural vazio e falha de consulta têm estados diferentes e permitem preenchimento manual enquanto o gestor tem acesso.
- **CA05 — Privacidade.** Com ambos os controles desmarcados, `enderecoCompleto` e `contato` aparecem como `null` nos dados públicos. Ligar apenas um revela somente o campo correspondente. O texto público é o confirmado pelo anunciante e não é complementado com outros campos do mural.
- **CA06 — Resultado e erros.** Um envio em andamento fica sinalizado e não permite uma segunda submissão simultânea. Um sucesso cria um anúncio `ABERTO` para a residência correta, consultável no fluxo existente, e confirma a ação em Moradores. Falha de upload ou publicação apresenta erro sem descartar o formulário. Cancelar antes do envio não cria anúncio.
- **CA07 — Autorização no servidor.** Publicação e upload rejeitam tentativas sem sessão, sem participação ativa ou sem papel de gestão na residência informada. Uma residência diferente nunca recebe fotos ou anúncios com base na autorização de outra.
- **CA08 — Responsividade e teclado.** Em celular, o botão e o formulário permanecem acessíveis sem rolagem horizontal. Com teclado, é possível abrir, preencher e cancelar, com foco no diálogo ao abrir e retorno ao acionador ao sair.
- **CA09 — Consulta e edição.** A seção lista anúncios abertos e fechados da casa atual, incluindo publicações anteriores. Criar ou editar atualiza o painel. A prévia aplica as flags de endereço e contato, inclusive para o anunciante. Outro morador vê o anúncio e seu autor e não recebe os valores ocultos ou ações reservadas ao anunciante.
- **CA10 — Decisão de interesse.** O anunciante vê os pedidos pendentes e pode aceitar ou recusar. A decisão atualiza a lista, e um pedido aceito passa a permitir abrir a conversa. Outro morador não pode consultar a lista de interessados nem responder pela API. Aceitar o interesse não inclui a pessoa na casa.
- **CA11 — Notificação.** A API registra o interesse pendente e o aviso para o anunciante juntos. O sino exibe o aviso pelo fluxo atual de atualização. O link abre o anúncio na área de interessados, e reenvio após recusa gera novo aviso. O destinatário é o anunciante, sem divulgar a mensagem do interessado na notificação.
- **CA12 — Aceite e atualização da interface.** Após confirmar o convite, a pessoa aparece como `MORADOR` em **Moradores**, sua situação de moradia passa a `MORANDO` e a tela inicial reconhece a casa sem que ela precise sair da conta ou recarregar manualmente. Convite expirado, recusado ou de outra pessoa não cria vínculo nem redireciona para a casa.
- **CA13 — Paridade dos cards.** Em Moradores, o card usa a mesma capa, estrutura, preço, localização e etiquetas da busca pública. As ações do anunciante ficam disponíveis junto à prévia. Anúncios sem foto usam a mesma ilustração de reserva da busca.
- **CA14 — Link de interesse em G07.** O cartão de interesse abre os interessados do anúncio em Moradores, pelo sino ou pela central. A ação de leitura do cartão só altera a notificação, e a área de interessados continua sujeita à autorização do anúncio. [SPEC-003](../003-configuracoes-da-casa/requirements.md#critérios-de-aceitação)

## Fora do escopo

Alterações em busca, filtros, fechamento de anúncios e mensagens da negociação. O mural e as preferências da casa continuam sendo editados pelos seus fluxos próprios.
