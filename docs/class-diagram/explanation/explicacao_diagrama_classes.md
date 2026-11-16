# Explicação do Diagrama de Classes

## Visão geral

O diagrama de classes representa a estrutura principal do sistema FullHouse. Ele organiza as classes de acordo com as funções do sistema e mostra como elas se relacionam.

As justificativas abaixo explicam a estrutura presente no diagrama e suas consequências para a representação dos dados. Elas não constituem um histórico das discussões da equipe. Não há registro de alternativas descartadas.

## Núcleo

A classe Usuario representa as pessoas que utilizam o sistema. Ela possui dados como código pessoal, nome, email, senha e situação de moradia.

A classe Casa representa uma casa cadastrada no sistema. Ela possui informações como nome, cidade, bairro e situação da casa.

A classe Participacao relaciona um usuário com uma casa. Ela define o papel do usuário, suas permissões e o período em que participa da casa.

A classe ConviteCasa representa um convite para uma pessoa entrar em uma casa.

**Justificativa da estrutura:** Participacao concentra papel, permissões e datas de entrada e saída no vínculo entre Usuario e Casa. Dessa forma, esses dados caracterizam a participação na casa, enquanto Usuario mantém os dados pessoais e Casa mantém os dados da moradia. ConviteCasa possui situação, expiração e operações de aceitar e recusar próprias, representando o convite separadamente da participação.

## Moradia

A parte de Moradia reúne o perfil de convivência da casa e os anúncios de quartos, conforme o agrupamento apresentado no diagrama.

A classe PerfilConvivenciaCasa guarda as regras e preferências de convivência da casa, como aceitar animais, permitir fumar e receber visitas.

A classe AnuncioQuarto permite publicar informações sobre quartos disponíveis.

**Justificativa da estrutura:** PerfilConvivenciaCasa reúne preferências da casa, como aceitar animais e permitir visitas, enquanto AnuncioQuarto contém informações de uma oferta, como valor mensal, descrição e situação de atividade. Essa separação distingue as características da casa dos dados de cada anúncio. Os campos exibirEndereco e exibirContato registram opções de divulgação do anúncio, sem que o diagrama detalhe como essas opções são aplicadas na interface.

## Convivência

A classe Pet representa os animais cadastrados na casa.

A classe ItemDespensa representa itens armazenados na despensa.

A classe RegraConvivencia representa regras definidas para a convivência entre os moradores.

A classe Reuniao representa reuniões da casa. Ela possui título, pauta, data, horário e situação.

A classe Mensagem representa mensagens trocadas entre os usuários.

**Justificativa da estrutura:** As classes deste módulo representam informações com estruturas diferentes: Pet possui espécie e raça; ItemDespensa possui propriedade e validade; RegraConvivencia possui título e descrição; Reuniao possui data, situação e operações de reagendar e cancelar; Mensagem possui conteúdo e momento de envio. A separação permite representar os atributos e comportamentos específicos de cada elemento. As relações com Casa identificam a moradia correspondente, enquanto as relações de Participacao indicam atuações específicas, como enviar mensagens e marcar reuniões.

## Tarefas

A classe DefinicaoTarefa representa a configuração de uma tarefa. Ela define título, cor, escopo, periodicidade, tipo de atribuição e período.

A classe InstanciaTarefa representa uma ocorrência específica de uma tarefa. Ela possui uma data prevista, prazo e situação.

A classe FilaRodizio organiza a ordem dos moradores quando uma tarefa é distribuída por rodízio.

A classe SolicitacaoTrocaTarefa representa uma solicitação para trocar uma tarefa entre moradores.

**Justificativa da estrutura:** A relação entre DefinicaoTarefa e InstanciaTarefa permite que uma mesma definição gere várias ocorrências. Periodicidade e tipo de atribuição ficam na definição. Prazo, situação e momento de conclusão ficam em cada ocorrência. Assim, a conclusão de uma ocorrência pode ser representada separadamente da configuração da tarefa. FilaRodizio registra ordem e atividade das posições do rodízio. SolicitacaoTrocaTarefa mantém tipo, situação e expiração da solicitação, distinguindo o pedido de troca da ocorrência à qual ele se refere.

## Alertas

A classe Notificacao representa avisos enviados aos usuários. Ela possui título, mensagem, tipo e informação sobre leitura.

A classe Lembrete representa um aviso agendado, com uma data para lembrar e uma informação sobre envio. No diagrama, ele pode estar relacionado a InstanciaTarefa ou Despesa.

**Justificativa da estrutura:** Lembrete registra quando um aviso deve ocorrer e se foi enviado. Notificacao registra o conteúdo do aviso, seu tipo e se foi lido. A separação distingue o agendamento do aviso do estado de leitura da notificação. O diagrama não apresenta uma relação direta entre essas classes, portanto, essa estrutura, por si só, não especifica que todo lembrete gera uma notificação.

## Financeiro

A classe FundoReserva representa o dinheiro acumulado pela casa. Ela permite registrar contribuições, usos e consultar o saldo.

A classe Despesa representa uma conta ou gasto da casa. Ela possui valor, tipo, vencimento e situação.

A classe RateioDespesa representa a divisão de uma despesa entre os moradores. Cada registro informa o valor que uma pessoa deve pagar e se o pagamento foi realizado.

A classe MovimentacaoFundo registra alterações no dinheiro do fundo de reserva.

A classe ComprovantePagamento guarda o arquivo usado para comprovar um pagamento.

A classe Subgrupo reúne participações e pode restringir o rateio de despesas.

**Justificativa da estrutura:** Despesa registra o valor total e a situação da conta, enquanto RateioDespesa registra o valor devido e o pagamento de cada participação. A relação de uma despesa com um ou mais rateios permite representar os pagamentos separadamente, sem resumir todas as parcelas ao estado geral da despesa. ComprovantePagamento está associado ao rateio, vinculando o arquivo à parcela correspondente. Subgrupo representa um conjunto de participações relacionado à restrição do rateio. FundoReserva e MovimentacaoFundo distinguem o fundo das operações que alteram seus recursos, cada movimentação registra tipo, valor, motivo e momento da operação.

## Enumerações

As enumerações definem valores que podem ser usados pelas classes do sistema.

Entre elas estão StatusSolicitacao, Papel, Permissao, StatusCasa, StatusMoradia, StatusTarefa, Periodicidade, TipoAtribuicao, Escopo, TipoDespesa e StatusDespesa.

Esses valores ajudam a manter os estados das entidades organizados e evitam valores diferentes para a mesma informação.

**Justificativa da estrutura:** Tipos como StatusTarefa e StatusDespesa enumeram explicitamente os estados representados no modelo. Isso delimita os valores previstos para esses atributos. A enumeração, isoladamente, não define quais transições entre estados são permitidas, essas regras não estão detalhadas no diagrama.

## Relações principais

Usuario se relaciona com Casa pela criação da casa e por meio de Participacao, que representa o vínculo de moradia.

Uma Casa possui moradores por meio da classe Participacao e pode possuir tarefas, despesas, reuniões, mensagens e outras informações relacionadas à convivência.

Uma DefinicaoTarefa pode gerar várias InstanciaTarefa. Quando a tarefa utiliza rodízio, a FilaRodizio organiza a ordem dos responsáveis.

Uma Despesa pode ser dividida em vários registros de RateioDespesa. O pagamento pode ser comprovado por um ComprovantePagamento.

De forma geral, o diagrama separa as responsabilidades do sistema em núcleo, moradia, convivência, tarefas, alertas e financeiro. Isso facilita a organização das regras e das informações do FullHouse.
