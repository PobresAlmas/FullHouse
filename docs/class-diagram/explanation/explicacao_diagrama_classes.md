# Explicação do Diagrama de Classes

## Visão geral

O diagrama de classes representa a estrutura principal do sistema FullHouse. Ele organiza as classes de acordo com as funções do sistema e mostra como elas se relacionam.

## Núcleo

A classe Usuario representa as pessoas que utilizam o sistema. Ela possui dados como código pessoal, nome, email, senha e situação de moradia.

A classe Casa representa uma casa cadastrada no sistema. Ela possui informações como nome, cidade, bairro e situação da casa.

A classe Participacao relaciona um usuário com uma casa. Ela define o papel do usuário, suas permissões e o período em que participa da casa.

A classe ConviteCasa representa um convite para uma pessoa entrar em uma casa.

A classe AnuncioQuarto permite publicar informações sobre quartos disponíveis.

## Moradia

A parte de Moradia reúne as classes relacionadas à organização da casa.

A classe PerfilConvivenciaCasa guarda as regras e preferências de convivência da casa, como aceitar animais, permitir fumar e receber visitas.

A classe Pet representa os animais cadastrados na casa.

A classe ItemDespensa representa itens armazenados na despensa.

A classe RegraConvivencia representa regras definidas para a convivência entre os moradores.

## Convivência

A classe Reuniao representa reuniões da casa. Ela possui título, pauta, data, horário e situação.

A classe Mensagem representa mensagens trocadas entre os usuários.

## Tarefas

A classe DefinicaoTarefa representa uma tarefa que será realizada de forma recorrente ou pontual. Ela define título, descrição, periodicidade, tipo de atribuição e período.

A classe InstanciaTarefa representa uma ocorrência específica de uma tarefa. Ela possui uma data prevista, prazo e situação.

A classe FilaRodizio organiza a ordem dos moradores quando uma tarefa é distribuída por rodízio.

A classe SolicitacaoTrocaTarefa representa uma solicitação para trocar uma tarefa entre moradores.

## Alertas

A classe Notificacao representa avisos enviados aos usuários. Ela possui título, mensagem, tipo e informação sobre leitura.

A classe Lembrete representa um aviso relacionado a uma tarefa ou outro evento, com uma data para lembrar e uma informação sobre envio.

## Financeiro

A classe FundoReserva representa o dinheiro acumulado pela casa. Ela permite registrar contribuições, usos e consultar o saldo.

A classe Despesa representa uma conta ou gasto da casa. Ela possui valor, tipo, vencimento e situação.

A classe RateioDespesa representa a divisão de uma despesa entre os moradores. Cada registro informa o valor que uma pessoa deve pagar e se o pagamento foi realizado.

A classe MovimentacaoFundo registra alterações no dinheiro do fundo de reserva.

A classe ComprovantePagamento guarda o arquivo usado para comprovar um pagamento.

## Enumerações

As enumerações definem valores que podem ser usados pelas classes do sistema.

Entre elas estão StatusSolicitacao, Papel, Permissao, StatusCasa, StatusMoradia, StatusTarefa, Periodicidade, TipoAtribuicao, Escopo, TipoDespesa e StatusDespesa.

Esses valores ajudam a manter os estados das entidades organizados e evitam valores diferentes para a mesma informação.

## Relações principais

Um Usuario pode criar uma Casa e participar de uma ou mais casas conforme as regras do sistema.

Uma Casa possui moradores por meio da classe Participacao e pode possuir tarefas, despesas, reuniões, mensagens e outras informações relacionadas à convivência.

Uma DefinicaoTarefa pode gerar várias InstanciaTarefa. Quando a tarefa utiliza rodízio, a FilaRodizio organiza a ordem dos responsáveis.

Uma Despesa pode ser dividida em vários registros de RateioDespesa. O pagamento pode ser comprovado por um ComprovantePagamento.

De forma geral, o diagrama separa as responsabilidades do sistema em núcleo, moradia, convivência, tarefas, alertas e financeiro. Isso facilita a organização das regras e das informações do FullHouse.
