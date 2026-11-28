# SPEC-007 — Insights financeiros da residência

**Origem:** feedback de avaliação do projeto e evolução do requisito RF020 do documento de requisitos.

## Objetivo

Disponibilizar uma página de Insights para moradores entenderem como as cotas das despesas da casa estão distribuídas e acompanharem valores pagos, pendentes e atrasados por morador e por mês.

## História de usuário

Como morador de uma residência, quero comparar o que cada pessoa devia e marcou como pago, filtrar os dados por período e subgrupo e identificar atrasos, para entender a situação financeira compartilhada da casa.

## Pré-condições

- Sessão autenticada.
- Participação ativa na residência para consultar seus Insights.
- Os dados considerados são os de despesas residenciais e rateios visíveis ao usuário pelas regras atuais do Financeiro.

## Decisões de métrica baseadas no sistema atual

- `despesa.status` representa a situação geral da conta. `rateio_despesa.pago` representa se cada morador marcou sua própria cota como paga. Os dois estados não são intercambiáveis.
- O comparativo entre moradores usa o valor devido em cada `rateio_despesa`, a marcação `pago` e a data de vencimento da despesa. Não usa o valor integral da conta como se fosse a cota de cada morador.
- O estado pago é informado no sistema pelos moradores; não há confirmação bancária automática. `pago_em` registra a data da marcação atual e é apagado quando a cota volta para pendente. O gráfico mensal representa a situação atual das cotas por mês de vencimento, não um extrato histórico de transações.
- O schema prevê `pagamento` e `alocacao_pagamento`, mas o fluxo atual do backend não grava nessas tabelas. Transferências parciais, destinatário do repasse e histórico imutável de pagamentos não fazem parte desta entrega.
- O enum de tipo prevê `FIXA` e `VARIAVEL`, mas o cadastro atual grava despesas como `VARIAVEL`. A tela não oferece filtro por tipo até que o cadastro passe a persistir a escolha do usuário.
- Algumas despesas antigas podem não ter rateios persistidos. A tela informa essas despesas separadamente e não inventa cotas nem situações de pagamento para elas.

## Requisitos funcionais

- **RF01 — Página de Insights.** Disponibilizar /finance/insights como página própria do módulo Financeiro, com acesso a partir de /finance e retorno para ela. A navegação global destaca Insights nessa rota e Financeiro em /finance.
- **RF02 — Acesso residencial.** A página apresenta Insights da residência no contexto Casa. Somente membros ativos da residência consultam seus dados; o servidor valida o vínculo e aplica as mesmas restrições de visibilidade de despesas e subgrupos do Financeiro.
- **RF03 — Filtros de período.** Iniciar no mês atual e permitir selecionar o próximo mês, os últimos seis meses ou um intervalo personalizado inclusivo. Após salvar uma despesa residencial, oferecer no Financeiro um atalho para o mês de vencimento na residência da despesa. Rejeitar intervalo inválido, vazio ou com início posterior ao fim. O período usa o fuso de negócio `America/Fortaleza`.
- **RF04 — Filtros de análise.** Permitir filtrar por morador, subgrupo e situação da cota (`Todas`, `Pagas`, `Pendentes` ou `Atrasadas`). O padrão é `Todos`. O filtro de morador identifica uma participação da residência, não um usuário fornecido sem validação. O filtro de situação aplica-se às métricas de cotas; o quadro separado de contas inteiras considera apenas contas marcadas como quitadas.
- **RF05 — Resumo financeiro do período.** Exibir o total devido em cotas, o total das cotas marcadas como pagas, o total em aberto e o total em atraso. Exibir também o percentual do valor devido que está marcado como pago. Valores são calculados sobre os rateios que correspondem ao período e aos filtros.
- **RF06 — Comparativo por morador.** Apresentar, para cada participação com cota no recorte, valor devido, valor marcado como pago, valor em aberto, valor vencido e percentual quitado. Permitir identificar maiores valores pagos e maiores pendências sem tratar valores devidos diferentes como uma comparação equivalente. Em um quadro visualmente separado, mostrar também o valor integral das contas marcadas como quitadas agrupado por quem registrou o pagamento da conta (`despesa.pago_por_participacao_id`). Esse segundo valor não compõe a cota individual do morador.
- **RF07 — Evolução mensal.** Agrupar as cotas pelo mês de vencimento e comparar valor devido, valor atualmente marcado como pago e valor atualmente em aberto. A situação de cada cota é a atual, mesmo para vencimentos de meses anteriores.
- **RF08 — Lista de atrasos.** Listar cotas não pagas cujo vencimento seja anterior à data atual de Fortaleza, indicando despesa, morador, vencimento, valor e dias em atraso. A lista respeita os mesmos filtros e pode ser ordenada pelos maiores atrasos ou valores.
- **RF09 — Rateios ausentes.** Informar a quantidade e o valor das despesas do período sem rateio persistido. Essas despesas não entram no comparativo por morador nem nos totais de cotas. O valor integral continua disponível como dado da conta, sem ser atribuído artificialmente a um morador.
- **RF10 — Estados da página.** Apresentar carregamento, erro com opção de tentar novamente, residência ausente, resultado vazio e ausência de cotas no período. Não exibir dados demonstrativos como resultados reais.
- **RF11 — Dados locais de demonstração.** Estender o mecanismo existente de carga local para incluir despesas residenciais claramente identificadas como demonstração, com vencimentos em seis meses, rateios pagos e pendentes, contas quitadas por moradores diferentes, um subgrupo e uma despesa sem rateio. Esses registros servem para visualizar os Insights no ambiente local e não são criados pela interface nem inseridos em produção.
- **RF12 — Gráficos para comparar cotas e atrasos.** Incluir um gráfico por morador com o percentual de cotas marcadas como pagas, ordenado do menor para o maior, e outro com o valor e a quantidade de cotas em atraso por morador. Ambos usam dados autorizados do agregado de Insights. A taxa de cotas pagas considera todas as situações de cota para manter o denominador total devido; período, morador e subgrupo selecionados continuam aplicados. O gráfico de atraso também respeita o filtro de situação.
- **RF13 — Tópico Insights na barra lateral.** Apresentar Insights como tópico próprio da navegação global para membros de uma residência. A rota /finance/insights destaca esse item e /finance continua destacando Financeiro. Sem residência, ocultar Insights junto às demais áreas residenciais.
- **RF14 — Painel personalizável.** Permitir escolher quais blocos de indicadores e gráficos financeiros ficam visíveis: resumo da casa, percentual pago por morador, atrasos por morador, comparativo das cotas, evolução mensal, contas inteiras pagas por morador e lista de cotas em atraso. Todos começam visíveis. As escolhas são salvas neste navegador por usuário autenticado e podem ser restauradas ao padrão; ocultar um bloco não altera filtros, consultas ou cálculos.

## Requisitos não funcionais

- **RNF01 — Autorização e isolamento.** O servidor deriva o usuário da sessão, valida sua participação ativa e filtra a residência e despesas autorizadas. IDs de residência, morador ou subgrupo fornecidos na URL não concedem acesso por si só.
- **RNF02 — Consistência das métricas.** Uma atualização de filtro aplica o mesmo recorte aos cartões, comparativo, série mensal e lista de atrasos. Contas canceladas não participam dos indicadores.
- **RNF03 — Transparência.** Os rótulos distinguem cota individual de conta da casa e informam que o pagamento é uma marcação registrada no sistema, sem sugerir confirmação bancária ou histórico de transferências.
- **RNF04 — Acessibilidade e responsividade.** Gráficos têm título, legenda, valores legíveis e alternativa textual/tabelar. Cores não são o único indicador de estado. Filtros e estados funcionam por teclado e em telas estreitas sem perda de conteúdo essencial.
- **RNF05 — Precisão temporal.** Limites do período e vencimentos são tratados como datas locais da residência, no fuso `America/Fortaleza`, sem deslocamento de dia por conversão UTC.
- **RNF06 — Segurança da carga local.** A carga é transacional, idempotente e aditiva; identifica os registros como demonstração, não apaga dados existentes, não altera registros existentes e recusa execução quando `NODE_ENV=production`.
- **RNF07 — Preferências de visualização.** Guardar apenas as opções de visibilidade no armazenamento local do navegador, separadas pelo ID do usuário e com versão de chave. Se o armazenamento estiver indisponível, permitir a personalização durante a sessão sem impedir a consulta dos Insights.

## Regras de negócio

1. Uma cota está **em aberto** quando `rateio_despesa.pago = false`. Está **em atraso** quando continua em aberto e a `despesa.data_vencimento` é anterior ao dia atual no fuso de Fortaleza. Cotas sem vencimento podem ser pendentes, mas não são classificadas como atrasadas.
2. `valor_pago` corresponde ao valor integral de `valor_devido` quando a cota está marcada como paga. O sistema atual não registra pagamento parcial.
3. O percentual quitado é `valor_pago / valor_devido` no conjunto filtrado. Com valor devido igual a zero, exibir `—` em vez de dividir por zero.
4. Os valores das cotas são agrupados pelo vencimento da despesa. `pago_em` não é usado como histórico de fluxo de caixa, pois o valor é apagado quando o usuário desfaz a marcação.
5. O comparativo considera participações associadas aos rateios do período, inclusive participações encerradas que ainda possuam uma cota histórica no recorte. Identificá-las como participação encerrada.
6. A análise de subgrupo segue o acesso aplicado pelo módulo Financeiro. Despesas não visíveis ao usuário não podem ser incluídas em totais agregados.
7. Despesa marcada integralmente como quitada e cota individual marcada como paga são fatos distintos. A página não soma o valor integral da conta como se fosse pagamento da cota de cada morador.
8. Despesas sem data de vencimento não pertencem a um intervalo de vencimentos e ficam fora dos valores daquele período. A tela não infere uma data para incluí-las.

## Critérios de aceitação

- **CA01 — Navegação e acesso.** Um membro ativo abre `/finance/insights` pela página Financeiro. Uma conta sem residência vê um estado vazio. Um usuário sem participação ativa não recebe dados da residência, inclusive ao trocar o ID na URL.
- **CA02 — Períodos.** A primeira abertura seleciona o mês atual em `America/Fortaleza`. Os presets de seis meses e o intervalo personalizado atualizam todos os blocos. Datas inicial e final inclusivas são preservadas como datas locais.
- **CA03 — Resumo e cálculo.** Para rateios de R$ 100 pagos, R$ 50 pendentes e R$ 20 em atraso dentro do recorte, os indicadores mostram R$ 170 devidos, R$ 100 pagos, R$ 70 em aberto, R$ 20 em atraso e 58,82% quitado. Uma cota em atraso também integra o total em aberto, sem ser somada duas vezes.
- **CA04 — Comparação por morador.** Cada valor é agrupado pelo ID de participação e apresentado com nome e situação ativa/encerrada. Alterar o filtro de morador recalcula todos os indicadores e mantém o nome correspondente à residência atual.
- **CA04a — Conta e cota não se misturam.** Se uma conta de R$ 300 está marcada como quitada por A, o quadro de contas integra R$ 300 a A. O comparativo de cotas continua usando somente os valores e estados dos rateios dos moradores; a conta integral não é somada à cota paga de A.
- **CA05 — Série mensal.** As cotas aparecem no mês de vencimento. Cada mês separa devido, atualmente pago e atualmente pendente; vencimentos passados refletem o estado salvo hoje, não um estado histórico de fim de mês.
- **CA06 — Atrasos.** Uma cota vence ontem e segue pendente aparece com um dia de atraso. Uma cota pendente que vence hoje ou no futuro não aparece como atrasada. Uma cota paga não aparece na lista.
- **CA07 — Rateio ausente.** Despesa sem rateio não aumenta os valores por morador. A interface mostra quantidade e valor excluídos do comparativo; não cria uma divisão estimada.
- **CA08 — Filtros de autorização.** Filtro por subgrupo só aceita subgrupo da residência autorizada e visível ao usuário. Despesas de outro subgrupo ou residência não vazam em totais, gráficos, contagens nem mensagens de erro.
- **CA09 — Estados e acessibilidade.** Falha de rede, carregamento, ausência de dados e dados parciais têm apresentações distintas. Leitor de tela consegue consultar os valores dos gráficos por meio de legenda e conteúdo textual equivalente.
- **CA10 — Tela estreita.** Em largura de celular, filtros permanecem acessíveis e o comparativo e a lista continuam legíveis sem exigir rolagem horizontal da página inteira.
- **CA11 — Visualização local com dados.** Depois de executar a carga de demonstração documentada, a residência de demonstração contém dados dos seis meses, com moradores em situações diferentes, contas inteiras pagas, opção de subgrupo e dados não rateados. A página apresenta os registros a partir da API e do banco, não de valores fixos no cliente. Reexecutar a carga não duplica nem altera os registros existentes.
- **CA12 — Tópico na barra lateral.** Com residência, a navegação global apresenta Insights como item próprio e leva a /finance/insights; essa rota destaca Insights, enquanto /finance continua destacando Financeiro. Sem residência, Insights fica oculto junto às outras áreas residenciais.
- **CA13 — Comparação visual acionável.** A taxa por morador é calculada como valor marcado pago dividido pelo valor devido em todas as situações, exclui quem não tem cotas devidas e ordena a menor taxa primeiro. O gráfico de atraso ordena pelo maior valor vencido e informa quantidade de cotas. Alterar período, morador ou subgrupo atualiza ambos; alterar situação atualiza o gráfico de atraso, sem distorcer a taxa de pagamento. Os gráficos mostram valores textuais acessíveis e uma nota explica que “pago” é uma marcação do sistema.
- **CA14 — Escolher visualizações.** Na primeira visita, os sete blocos definidos em RF14 estão visíveis. A pessoa pode ocultar ou reexibir cada bloco por controle com rótulo e teclado; a seleção não muda filtros nem resultados dos outros blocos. Ao recarregar ou voltar à página no mesmo navegador e usuário, a escolha é mantida; outro usuário no mesmo navegador recebe suas próprias escolhas. A ação “Restaurar padrão” volta a exibir todos os blocos. Se todos estiverem ocultos, uma orientação e um atalho para reexibi-los continuam visíveis. Se o armazenamento local falhar, as opções continuam funcionando até sair da página.

## Fora do escopo

- Registrar pagamentos, transferências entre moradores, pagamentos parciais ou histórico financeiro imutável.
- Confirmar transações por banco ou serviço externo.
- Estimar rateios ausentes ou alterar automaticamente o cadastro de despesas.
- Filtrar por tipo fixo/variável enquanto o formulário persistir todos os novos registros como `VARIAVEL`.
- Dashboard pessoal de credores/destinatários. O requisito original RF020 prevê “para quem devo pagar”, mas a aplicação não grava atualmente o destino de um repasse no fluxo de despesas. Esse fluxo deve ser especificado junto à integração das tabelas `pagamento` e `alocacao_pagamento`.
