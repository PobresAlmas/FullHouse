# DER em visões UML

Os diagramas representam o modelo de dados em 14 visões. Cada tabela aparece detalhada em uma visão, referências externas mostram as mesmas entidades com os atributos ocultos.

O recorte da visão é resumido, não mostra todos os campos, vínculos e restrições do banco.

## Leitura e fontes das explicações

A existência de uma tabela no esquema também não comprova que todas as operações relacionadas já estejam implementadas.

## Diagramas em PDF

Cada PDF contém uma visão em uma página com dimensões ajustadas ao diagrama.

| Visão                            | PDF                                       |
| -------------------------------- | ----------------------------------------- |
| Núcleo e acesso                  | [Abrir PDF](pdf/01-nucleo.pdf)            |
| Configurações, perfil e anúncios | [Abrir PDF](pdf/02-moradia-anuncios.pdf)  |
| Definição, execução e rodízio    | [Abrir PDF](pdf/03-tarefas.pdf)           |
| Trocas de tarefas                | [Abrir PDF](pdf/04-trocas-tarefas.pdf)    |
| Subgrupos, despesas e rateios    | [Abrir PDF](pdf/05-despesas-rateios.pdf)  |
| Pagamentos e comprovantes        | [Abrir PDF](pdf/06-pagamentos.pdf)        |
| Fundo e lançamentos financeiros  | [Abrir PDF](pdf/07-fundo-lancamentos.pdf) |
| Despensa e lista de compras      | [Abrir PDF](pdf/08-despensa-compras.pdf)  |
| Pets e cuidados                  | [Abrir PDF](pdf/09-pets.pdf)              |
| Regras e propostas               | [Abrir PDF](pdf/10-regras.pdf)            |
| Reuniões e presença              | [Abrir PDF](pdf/11-reunioes.pdf)          |
| Conversas, mensagens e leitura   | [Abrir PDF](pdf/12-mensagens.pdf)         |
| Penalidades e negociação         | [Abrir PDF](pdf/13-penalidades.pdf)       |
| Lembretes e notificações         | [Abrir PDF](pdf/14-alertas.pdf)           |

## Função das tabelas e justificativas estruturais

### Núcleo e acesso

| Tabela                   | O que representa e faz                                                                    | Justificativa da estrutura                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `USUARIO`                | Representa a pessoa cadastrada, com identificação, dados de acesso e situação de moradia. | A identidade fica separada do vínculo com uma casa, papel e período de moradia pertencem a PARTICIPACAO.                                            |
| `PASSWORD_RESET`         | Registra códigos de recuperação de senha, expiração e indicação de uso.                   | Cada solicitação possui validade e estado próprios, sem acrescentar esses dados temporários ao cadastro principal.                                  |
| `CASA`                   | Identifica uma moradia, seu nome, localização, situação e usuário criador.                | Fornece uma referência comum para os dados da moradia, como participações, anúncios e configurações.                                                |
| `PARTICIPACAO`           | Representa o vínculo entre usuário e casa, com papel e datas de entrada e saída.          | Esses dados caracterizam a participação naquela casa, enquanto USUARIO conserva a identidade da pessoa.                                             |
| `CONVITE_CASA`           | Registra um convite de entrada, seu destinatário, situação e prazo de expiração.          | O convite possui um estado anterior à participação, registrá-lo separadamente permite representar também convites não aceitos.                      |
| `PERMISSAO_PARTICIPACAO` | Associa uma permissão a uma participação e registra os dados de concessão.                | A chave composta por participação e permissão identifica cada autorização, permitindo várias permissões por vínculo sem repetir a mesma combinação. |

### Configurações, perfil e anúncios

| Tabela                    | O que representa e faz                                                                                              | Justificativa da estrutura                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `CONFIGURACAO_CASA`       | Reúne parâmetros da casa, como política de criação e edição, rateio e limites relacionados a penalidades e votação. | Usar casa_id como chave primária vincula o conjunto de parâmetros a uma única casa e separa configurações dos dados de identificação.         |
| `PERFIL_CONVIVENCIA_CASA` | Registra preferências de convivência e divulgação do perfil da casa, incluindo pets, fumo, visitas e silêncio.      | O perfil reúne características de convivência em um registro por casa, identificado por casa_id, separado dos parâmetros operacionais.        |
| `ANUNCIO_QUARTO`          | Representa a oferta de moradia, com título, valor mensal, localização, situação e opções de divulgação.             | Os dados de uma oferta têm situação própria e podem variar entre anúncios da mesma casa, por isso não se confundem com o cadastro da moradia. |
| `INTERESSE_ANUNCIO`       | Registra o interesse de um usuário em determinado anúncio, com mensagem e situação.                                 | A associação mantém os dados da manifestação separados tanto do usuário quanto do anúncio, que pode receber vários interesses.                |

### Definição, execução e rodízio

| Tabela             | O que representa e faz                                                                                    | Justificativa da estrutura                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `DEFINICAO_TAREFA` | Descreve a configuração da tarefa, incluindo escopo, recorrência, período e forma de atribuição.          | Uma definição pode gerar várias ocorrências, a configuração permanece separada das datas e estados de execução de cada uma.    |
| `INSTANCIA_TAREFA` | Registra uma ocorrência da tarefa, sua data, prazo, responsabilidade e situação de execução.              | Cada ocorrência possui estado próprio. A unicidade de definição e data prevista distingue as ocorrências no esquema.           |
| `FILA_RODIZIO`     | Relaciona uma definição de tarefa aos participantes e às posições do rodízio, com indicação de atividade. | A chave formada por definição e ordem identifica cada posição e permite representar uma sequência específica para cada tarefa. |

### Trocas de tarefas

| Tabela                     | O que representa e faz                                                                                          | Justificativa da estrutura                                                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SOLICITACAO_TROCA_TAREFA` | Registra o pedido de troca, solicitante, destinatário, tarefa de origem, possível tarefa alvo, tipo e situação. | O pedido tem estado próprio, separado da execução da tarefa, os dois vínculos com INSTANCIA_TAREFA distinguem origem e alvo quando este é informado. |

### Subgrupos, despesas e rateios

| Tabela            | O que representa e faz                                                                              | Justificativa da estrutura                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUBGRUPO`        | Identifica um grupo associado à casa e relacionado a participações e despesas.                      | O grupo possui identidade própria, permitindo que despesas façam referência ao conjunto de participantes definido por MEMBRO_SUBGRUPO.                      |
| `MEMBRO_SUBGRUPO` | Associa uma participação a um subgrupo e registra entrada e saída.                                  | A tabela representa a relação entre grupos e participações, a chave composta identifica cada par e seus dados de pertencimento.                             |
| `DESPESA`         | Registra uma obrigação financeira, com descrição, escopo, valor total, tipo, vencimento e situação. | A conta é representada separadamente das parcelas dos moradores: seu valor e estado geral ficam em DESPESA, e os dados individuais ficam em RATEIO_DESPESA. |
| `RATEIO_DESPESA`  | Registra o valor devido por uma participação em uma despesa e sua situação de pagamento.            | A unicidade de despesa e participação identifica uma parcela por vínculo naquela conta, cada parcela conserva valor e pagamento próprios.                   |

### Pagamentos e comprovantes

| Tabela                  | O que representa e faz                                                                                                      | Justificativa da estrutura                                                                                                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PAGAMENTO`             | Representa um pagamento realizado por uma participação, com valor, método e datas de pagamento e confirmação.               | O pagamento é um registro distinto da dívida. Sua distribuição entre parcelas é representada por ALOCACAO_PAGAMENTO.                                                                          |
| `ALOCACAO_PAGAMENTO`    | Relaciona um pagamento a um rateio e informa o valor alocado.                                                               | A associação com valor próprio representa a distribuição de pagamentos entre rateios, a chave composta identifica cada par pagamento-rateio.                                                  |
| `COMPROVANTE_PAGAMENTO` | Armazena a referência ao arquivo e seu tipo, com vínculos opcionais a despesa, pagamento e rateio e identificação de envio. | O documento fica separado dos registros de valores e pagamentos. Os vínculos opcionais devem ser lidos como estão no esquema, sem presumir regras de exclusividade não mostradas no diagrama. |

### Fundo e lançamentos financeiros

| Tabela                  | O que representa e faz                                                                                   | Justificativa da estrutura                                                                                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FUNDO_RESERVA`         | Identifica o fundo da casa, com modalidade de contribuição, eventual valor fixo e meta.                  | A unicidade de casa_id limita a um fundo por casa no esquema, suas características ficam separadas dos lançamentos que registram movimentos financeiros.                                 |
| `LANCAMENTO_FINANCEIRO` | Registra um lançamento com natureza, origem, valor e momento, além de referências financeiras opcionais. | Cada operação tem registro próprio, distinguindo os movimentos das entidades que os originam. Esta tabela também referencia o fundo, não existe uma tabela MOVIMENTACAO_FUNDO no Prisma. |

### Despensa e lista de compras

| Tabela                  | O que representa e faz                                                                           | Justificativa da estrutura                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CATEGORIA_DESPENSA`    | Representa uma categoria de itens pertencente a uma casa.                                        | A identidade da categoria permite referenciá-la nos itens. A unicidade de casa e nome normalizado distingue os nomes dentro da moradia, e a FK composta dos itens inclui a casa. |
| `ITEM_DESPENSA`         | Representa um item armazenado, com categoria, propriedade, unidade, validade e eventual dono.    | O cadastro conserva as características do item, as alterações de quantidade são representadas separadamente por MOVIMENTACAO_DESPENSA.                                           |
| `MOVIMENTACAO_DESPENSA` | Registra entrada, consumo ou descarte de quantidade de um item, com autoria e momento.           | Uma mesma referência de item pode ter várias movimentações, sem repetir seus dados de cadastro em cada operação.                                                                 |
| `ITEM_LISTA_COMPRAS`    | Registra um item a comprar, com quantidade e unidade opcionais, observação e situação de compra. | Uma intenção de compra possui estado próprio e é diferente de um item já cadastrado na despensa. O esquema não apresenta uma relação direta entre essas duas tabelas.            |

### Pets e cuidados

| Tabela        | O que representa e faz                                                                                 | Justificativa da estrutura                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `PET`         | Identifica um animal da casa, com nome, espécie e demais dados de cadastro.                            | O animal possui identidade própria para reunir vários cuidados sem repetir suas características em cada registro.                             |
| `CUIDADO_PET` | Registra um cuidado de um pet, com tipo, data, informações descritivas e eventual vínculo com despesa. | Os cuidados são ocorrências distintas do cadastro do animal e podem ter dados financeiros próprios, mantendo opcional a referência à despesa. |

### Regras e propostas

| Tabela                | O que representa e faz                                                                                   | Justificativa da estrutura                                                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `REGRA_CONVIVENCIA`   | Representa uma regra da casa, com conteúdo, escopo, situação e possível referência à proposta de origem. | A regra e a proposta possuem situações diferentes no modelo, separar os registros distingue o conteúdo da regra do processo de discussão.                    |
| `PROPOSTA_REGRA`      | Registra uma proposta, seu prazo de votação, quórum, situação e eventual regra relacionada.              | A proposta pode existir sem uma regra associada. O vínculo regra_id e o vínculo proposta_origem_id da regra têm papéis distintos e são mantidos no diagrama. |
| `VOTO_PROPOSTA_REGRA` | Registra o voto de uma participação em uma proposta e o momento da votação.                              | A chave composta por proposta e participação identifica um registro de voto por par e separa as respostas individuais do estado da proposta.                 |

### Reuniões e presença

| Tabela                 | O que representa e faz                                                                                    | Justificativa da estrutura                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `REUNIAO`              | Representa uma reunião da casa, com título, pauta, data, situação e eventual referência de reagendamento. | O evento tem dados comuns a todos os participantes, as respostas de presença ficam em uma tabela associativa própria.     |
| `PARTICIPANTE_REUNIAO` | Associa uma participação a uma reunião e registra situação e momento de resposta.                         | A chave composta identifica cada par reunião-participação e permite que cada pessoa tenha uma resposta própria no evento. |

### Conversas, mensagens e leitura

| Tabela             | O que representa e faz                                                                             | Justificativa da estrutura                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CONVERSA`         | Representa o contexto de troca de mensagens da casa ou de um subgrupo, com tipo e título opcional. | Agrupa mensagens sem confundir a conversa com cada envio. O subgrupo_id opcional e único limita a uma conversa vinculada a cada subgrupo no esquema.       |
| `MENSAGEM`         | Registra o conteúdo enviado em uma conversa, sua autoria e o momento de envio.                     | Cada envio pertence a uma conversa e tem identidade e autoria próprias, o contexto comum fica em CONVERSA.                                                 |
| `LEITURA_CONVERSA` | Registra a última mensagem lida por uma participação em determinada conversa.                      | A leitura varia por participante. A chave composta por conversa e participação mantém um marcador individual, sem um estado global de leitura na mensagem. |

### Penalidades e negociação

| Tabela                  | O que representa e faz                                                                                                | Justificativa da estrutura                                                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `PENALIDADE`            | Registra uma penalidade de uma participação, com valor, situação, motivo e eventual ocorrência de tarefa relacionada. | A penalidade tem estado financeiro próprio e pode ser referenciada por negociações e lançamentos, sem incorporar esses registros à tarefa.    |
| `NEGOCIACAO_PENALIDADE` | Registra um pedido de negociação de penalidade, com solicitante, justificativa, situação e prazo de votação opcional. | O pedido possui dados e estado próprios, distintos da penalidade, seus votos são registrados individualmente em VOTO_NEGOCIACAO.              |
| `VOTO_NEGOCIACAO`       | Registra o voto de uma participação em uma negociação e o momento da votação.                                         | A chave composta por negociação e participação identifica um registro por par. A tabela, isoladamente, não determina o critério de aprovação. |
| `SALDO_NEGOCIACAO`      | Registra os limites disponíveis e as datas de ciclo e renovação de uma participação.                                  | A própria participação identifica o registro de controle, esses dados periódicos ficam separados dos pedidos individuais de negociação.       |

### Lembretes e notificações

| Tabela        | O que representa e faz                                                                                                                          | Justificativa da estrutura                                                                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `LEMBRETE`    | Registra um aviso agendado para um usuário, com momento previsto, indicação de envio e referências opcionais a tarefa, despesa, rateio ou item. | O agendamento possui data e estado de envio próprios. As referências identificam o assunto do lembrete sem incorporar o agendamento a cada uma dessas tabelas.                       |
| `NOTIFICACAO` | Registra um aviso para um usuário, com tipo, conteúdo, leitura e possível contexto de casa.                                                     | O estado de leitura pertence ao aviso destinado ao usuário. Ele difere do estado de envio de LEMBRETE, o esquema não apresenta uma ligação direta obrigatória entre as duas tabelas. |
