# SPEC-007 — Design

## Contexto e dependências

- A área financeira é servida por `/finance`, com contextos Casa/Pessoal, cartões de total pendente, pago no mês e média mensal, calendário e lista de despesas.
- O backend NestJS organiza as despesas em `ExpensesController`, `ExpensesService` e `ExpensesRepository`. `ResidenceAccessService` valida participação e autorização.
- `despesa` contém valor integral, vencimento, status geral e participação que marcou a conta como paga. `rateio_despesa` contém valor devido por participação, status de pagamento e data da marcação.
- O endpoint residencial atual devolve rateios e valores, mas não o status de cada rateio. Um novo agregado no backend precisa ler essa informação sem reaproveitar o mapper de despesas que mistura status da conta e rateio.
- A rota /finance/insights tem seção própria na barra lateral global e é marcada como ativa no AppShell. A biblioteca web atual não inclui pacote de gráficos; usar CSS/SVG e componentes existentes, sem adicionar dependência.
- O requisito RF020 do documento original traz saldo devedor, pagamentos no mês e destinatário. Esta entrega cobre comparativos residenciais e deixa o destinatário para uma integração futura com o modelo de pagamentos.

## Fluxo principal

1. O usuário abre **Insights** a partir de Financeiro. A página consulta a residência ativa e carrega a análise do mês atual.
2. O usuário muda período, morador, subgrupo ou situação da cota. A seleção fica na URL para ser recarregável e compartilhável dentro da mesma sessão autorizada.
3. O cliente consulta o agregado da residência. O backend exige participação ativa, valida os filtros e aplica as mesmas regras de visibilidade residencial e de subgrupo existentes no módulo de despesas.
4. O backend agrega rateios por vencimento, participação e subgrupo. Retorna valores em formato decimal textual para evitar erro de ponto flutuante no contrato.
5. A página atualiza os cartões, comparativos e lista. Se o filtro de situação não for ALL, faz uma consulta adicional com status ALL para manter correto o denominador do gráfico de taxa paga; período, morador e subgrupo permanecem aplicados. Se o período incluir despesas sem rateio, mostra aviso com quantidade e valor não distribuídos.

## Fluxos alternativos

- Sem residência ativa, apresentar orientação e link para Financeiro sem chamar o agregado com ID vazio.
- Se um filtro referenciar residência/subgrupo/morador não autorizado, responder sem dados e sem revelar se o recurso existe em outra casa.
- Intervalo inválido apresenta erro junto aos filtros e não mistura resultados de uma consulta anterior.
- Sem dados, mostrar valores zero ou estado vazio com texto explícito; não usar exemplos fictícios.
- Com rateios no período, mas sem atrasos, a lista informa que não há parcelas vencidas.
- Participações encerradas com rateio no recorte continuam no histórico e recebem indicação visual/textual de que não estão mais ativas.

## Interface

- Título **Insights financeiros** com retorno para Financeiro.
- Barra de filtros com período (`Mês atual`, `Últimos 6 meses`, `Personalizado`), datas de início e fim no modo personalizado, morador, subgrupo e situação da cota.
- Linha de cartões: **Devido em cotas**, **Marcado como pago**, **Em aberto**, **Em atraso** e **Percentual quitado**. Atraso é uma parte de “Em aberto”, não um total adicional.
- **Comparativo por morador:** barras horizontais empilhadas para pago e em aberto, com valor devido como total e percentual quitado como dado textual. Padrão de ordenação: maior valor em atraso; opção de ordenar por devido, pago ou percentual quitado. Mostrar “Sem cotas no período” para participações sem rateio dentro do recorte.
- **Contas inteiras quitadas por morador:** quadro separado que soma o valor integral das despesas residenciais atualmente `QUITADA`, agrupadas pela participação registrada em `pago_por_participacao_id`. O período continua usando o vencimento da despesa. O filtro de situação da cota não afeta este quadro. Se não houver participação registrada, mostrar uma linha “Responsável não informado”.
- **Evolução mensal:** barras agrupadas/empilhadas por mês de vencimento, separando valor devido, atualmente pago e atualmente em aberto. O mês atual como único mês pode produzir um único grupo; o preset dos últimos seis meses oferece a comparação temporal.
- **Cotas em atraso:** tabela compacta com morador, despesa, vencimento, dias de atraso e valor. Permitir ordenar por maior atraso ou maior valor. Em tela estreita, cada linha vira cartão com os mesmos campos.
- Aviso de dados parciais quando existirem despesas sem rateio; não atribuir valor por estimativa.
- Manter identidade da página Financeiro: fundo lavanda claro, cartões brancos, bordas discretas e verde para seleção/ação. Não comunicar estado somente pela cor.

## Dados de demonstração locais

- Estender `backend/prisma/seed.mjs`, chamado pelos comandos existentes `db:seed:dev` e `db:seed:test`, para popular a Casa de demonstração com despesas prefixadas `DEMO INSIGHTS` e vencimentos nos seis meses do período corrente.
- Incluir rateios de três moradores com combinações variadas de cotas pagas, pendentes e atrasadas; despesas gerais e em um subgrupo dedicado; contas integrais marcadas como quitadas por moradores diferentes; e uma despesa sem rateio para apresentar o estado de dados parciais.
- Criar apenas os registros de demonstração ausentes. Em nova execução, preservar alterações e registros já existentes. Rodar dentro da transação e manter as proteções de ambiente não produtivo existentes.
- A conta local de demonstração é `demo@example.com`; a senha é a variável `DEMO_USER_PASSWORD`. A carga também conserva as contas `ana@example.com` e `bruno@example.com` já descritas na documentação de desenvolvimento.

## Contrato HTTP proposto

`GET /expenses/homes/:homeId/insights`

| Parâmetro         | Uso                                                               |
| ----------------- | ----------------------------------------------------------------- |
| `from`            | Data inicial inclusiva em `YYYY-MM-DD`; a interface sempre envia. |
| `to`              | Data final inclusiva em `YYYY-MM-DD`; a interface sempre envia.   |
| `participationId` | Filtro opcional de morador da mesma residência.                   |
| `subgroupId`      | Filtro opcional de subgrupo autorizado e visível ao solicitante.  |
| `status`          | `ALL`, `PAID`, `PENDING` ou `OVERDUE`; padrão `ALL`.              |

Resposta conceitual:

```json
{
  "period": {
    "from": "2026-11-01",
    "to": "2026-11-30",
    "timeZone": "America/Fortaleza"
  },
  "summary": {
    "dueAmount": "0.00",
    "paidAmount": "0.00",
    "pendingAmount": "0.00",
    "overdueAmount": "0.00",
    "paidPercentage": 0,
    "unallocatedExpenseCount": 0,
    "unallocatedExpenseAmount": "0.00"
  },
  "members": [],
  "wholeBillsPaidByMember": [],
  "monthly": [],
  "overdueAllocations": []
}
```

Cada item de `members` contém `participationId`, nome, `active`, valores devido/pago/pendente/atrasado, percentual quitado e contagens de cotas por situação. `wholeBillsPaidByMember` contém participação opcional, nome, valor integral e quantidade de despesas atualmente quitadas que foram atribuídas a esse pagador. Cada item mensal contém mês, devido/pago/pendente/atrasado. Cada item atrasado contém ID e descrição da despesa, ID/nome do morador, vencimento, dias de atraso e valor. Valores monetários são strings com duas casas decimais.

O `status` filtra as cotas antes de calcular cartões, moradores, meses e lista. `OVERDUE` aplica `pago=false` e vencimento anterior ao dia local atual. Em consulta filtrada por morador, as métricas resumidas refletem somente as cotas daquele morador. A comparação de contas quitadas usa apenas `ALL`/`PAID` no nível de despesa, não o filtro de situação das cotas, e permanece visualmente separada.

## Integração e persistência

- Nenhuma migration é prevista. Reutilizar `despesa`, `rateio_despesa`, `participacao` e relações de subgrupo.
- O repositório precisa buscar somente despesas da residência ativa, não canceladas e visíveis segundo as regras existentes. Quando filtros de participação/subgrupo forem aplicados, validá-los dentro da mesma casa e respeitar o escopo de leitura.
- No período, `data_vencimento` é a referência para cotas e contas inteiras. Despesas sem vencimento ficam fora do intervalo; não se estima uma data para elas.
- A data atual para atraso é calculada em `America/Fortaleza`, alinhada às métricas da Home. Comparações usam datas `YYYY-MM-DD` sem converter para meia-noite UTC.
- A consulta deve retornar as participações encerradas que aparecem nos rateios selecionados, com `data_saida` usada para preencher `active=false`.
- A consulta calcula tudo no backend; a interface não baixa a lista inteira de despesas para agregar no navegador.

## Estados da interface

`loading`, `error`, `no-residence`, `empty-period`, `partial-data` e `ready`. Combinar `partial-data` com resultados válidos quando houver despesas sem rateio; não substituir outros estados por esse aviso.

## Decisões de implementação

- O comparativo de cotas usa rateios, não `despesa.pago_por_participacao_id`. A página também apresenta quem registrou a quitação da conta inteira, em quadro separado, e nunca soma esse valor às cotas individuais.
- O gráfico mensal representa vencimentos e status atual das cotas. Não usar `pago_em` como histórico transacional nem chamar a visualização de fluxo de caixa.
- Rateios antigos ausentes ficam fora das métricas individuais e são quantificados no aviso de dados parciais. Não fazer rateio estimado nem migration de backfill nesta entrega.
- O filtro por tipo FIXA/VARIAVEL fica fora enquanto o cadastro atual não persistir essa escolha.
- Os gráficos usam SVG/CSS com valores textuais equivalentes e sem dependência externa.

## Rastreabilidade

| Requisitos             | Design                                                  | Critérios       |
| ---------------------- | ------------------------------------------------------- | --------------- |
| RF01–RF04, RNF01       | Rota aninhada, filtros validados e agregado autenticado | CA01–CA02, CA08 |
| RF05–RF07, RNF02–RNF03 | Soma por rateio, comparativo e série por vencimento     | CA03–CA05       |
| RF08–RF09              | Lista de atrasos e transparência de rateios ausentes    | CA06–CA07       |
| RF10, RNF04–RNF05      | Estados, acessibilidade e datas locais                  | CA09–CA10       |

## Incremento: gráficos comparativos e navegação lateral

- A barra lateral terá um link independente chamado Insights, com destino /finance/insights. O AppShell mapeará essa rota antes de /finance para marcar o tópico correto; áreas residenciais, inclusive Insights, ficam ocultas quando a conta não tem residência.
- O gráfico **Percentual das cotas marcadas como pagas** ordena moradores do menor para o maior percentual. Usa valores devidos e pagos com todas as situações de cota, porque filtrar somente pendentes faria todos parecerem 0% pagos e filtrar somente pagas faria todos parecerem 100%. Período, morador e subgrupo continuam aplicados. A interface explica essa exceção ao filtro de situação e chama o estado de marcação feita no sistema.
- Se a situação selecionada não for ALL, a interface fará uma segunda leitura do endpoint existente com os mesmos filtros autorizados de período, morador e subgrupo e com status ALL. Não se altera o contrato nem se faz agregação de dados brutos no navegador.
- O gráfico **Valor em atraso por morador** usa valor e contagem de cotas vencidas devolvidos no agregado que respeita todos os filtros, ordenado do maior atraso em reais para o menor. O valor é uma parte do aberto; não deve ser somado outra vez ao resumo.
- Ambos usam barras horizontais em CSS, legenda/descrição textual e rótulos acessíveis. Sem cotas correspondentes, mostrar mensagem de vazio em vez de dados artificiais. Os gráficos entram no grid responsivo já usado pelos comparativos.

| Requisitos | Decisões | Critérios |
| --- | --- | --- |
| RF12, RNF02–RNF04 | Gráficos por taxa quitada e atraso usando agregados autorizados | CA09, CA13 |
| RF13, RNF04 | Item próprio no AppSidebar e rota específica antes de /finance | CA12 |

## Incremento: personalização do painel (IHC)

- Todas as visualizações começam ativas, para que a primeira abertura mostre o panorama completo da casa sem exigir configuração prévia.
- Um grupo recolhível **Personalizar visualizações** mantém os controles fora do caminho principal. Cada opção é um checkbox acompanhado de nome e explicação curta; o grupo mostra quantos dos sete blocos estão visíveis. Os rótulos usam termos financeiros descritivos, sem classificar moradores como bons ou ruins.
- As opções controlam somente a apresentação de sete blocos: resumo, taxa paga por morador, atraso por morador, comparativo das cotas, evolução mensal, contas inteiras pagas e cotas em atraso. Período, morador, subgrupo e situação continuam como filtros de dados independentes.
- A ação **Restaurar padrão** reativa todos os blocos. Se todos forem ocultados, a grade apresenta uma orientação com ação equivalente para evitar uma tela aparentemente vazia.
- Persistir as opções em `localStorage` com uma chave versionada e particionada pelo ID autenticado (`fullhouse:insights:view-preferences:v1:<userId>`). Guardar somente booleanos de visibilidade, sem métricas ou dados pessoais. Na troca de usuário, carregar as opções daquele ID antes de gravar; erro de leitura/escrita não bloqueia a página e as opções seguem na memória até sair dela.
- Usar `<details>/<summary>` para a divulgação progressiva e controles nativos de formulário, com foco visível e instruções textuais. O resumo da quantidade e o aviso de todos ocultos deixam o estado do painel claro para teclado e leitor de tela.

| Requisitos | Decisões | Critérios |
| --- | --- | --- |
| RF14, RNF04, RNF07 | Sete blocos selecionáveis, todos ativos inicialmente, preferências locais por usuário e restauração em um passo | CA14 |
