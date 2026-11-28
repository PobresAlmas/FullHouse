# SPEC-007 — Tarefas

## Especificação

- [x] **T01 — Analisar métricas e fontes financeiras.** Distinguir status da conta e status da cota, conferir datas, subgrupos, pagamentos previstos no schema e limitações do fluxo atual. **Refs:** RF05–RF09, RNF03, regras 1–7.
- [x] **T02 — Definir filtros, cálculos e contrato da tela.** Registrar período padrão, filtros por participação/subgrupo/situação, agrupamento mensal por vencimento e tratamento de rateios ausentes. **Refs:** RF03–RF09, CA02–CA08.

## Backend

- [x] **T03 — Validar consultas de Insights.** Criar DTO de query para intervalo, participação, subgrupo e situação; validar datas, ordem, enumeração e escopo dos IDs. **Refs:** RF03–RF04, RNF01, CA02, CA08.
- [x] **T04 — Agregar dados autorizados.** Criar consulta no repositório de despesas para a residência ativa, rateios e despesas não canceladas, preservando visibilidade de subgrupos e participações encerradas com cotas históricas. **Refs:** RF02, RF05–RF09, RNF01–RNF03, CA03–CA08.
- [x] **T05 — Expor endpoint de Insights.** Adicionar `GET /expenses/homes/:homeId/insights`, validação de participação no serviço e resposta tipada com resumo, comparação, série mensal, atrasos e dados não rateados. **Refs:** RF01–RF10, RNF01–RNF05.

## Frontend

- [x] **T06 — Criar cliente de Insights.** Definir os tipos e a consulta HTTP com serialização dos filtros e valores monetários como strings decimais. **Refs:** RF03–RF09.
- [x] **T07 — Integrar a navegação da página.** Criar /finance/insights, incluir tópico próprio na barra lateral, acesso a partir de /finance e retorno à tela financeira. **Refs:** RF01, RF13, CA01, CA12.
- [x] **T08 — Implementar filtros e estados.** Criar presets Mês atual/Últimos 6 meses/Personalizado, filtros de morador/subgrupo/situação e sincronização com a URL; implementar carregamento, erro, casa ausente, vazio e dados parciais. **Refs:** RF02–RF04, RF09–RF10, CA01–CA02, CA07–CA09.
- [x] **T09 — Implementar cartões e comparativos por morador.** Mostrar totais derivados de cotas, barras de pago versus aberto e contas inteiras quitadas por pagador, com percentual, ordenação e indicação de participação encerrada. **Refs:** RF05–RF06, RNF02–RNF04, CA03–CA04, CA09–CA10.
- [x] **T10 — Implementar evolução mensal e lista de atrasos.** Agrupar por mês de vencimento, separar situação atual das cotas, listar parcelas vencidas com valor e dias de atraso e permitir ordenar a lista por dias ou valor. **Refs:** RF07–RF08, RNF02–RNF05, CA05–CA06, CA09–CA10.
- [x] **T11 — Adaptar layout estreito e acessibilidade.** Fornecer rótulos/legendas e alternativa textual aos gráficos, estados além de cor, interação por teclado e apresentação móvel sem corte da página. **Refs:** RNF04, CA09–CA10.

## Dados locais de demonstração

- [x] **T13 — Especificar a carga de Insights.** Definir residência, moradores, intervalo, valores, status de cota e conta, subgrupo, registro sem rateio e regras de idempotência da carga local. **Refs:** RF11, RNF06, CA11.
- [x] **T14 — Estender e documentar o seed local existente.** Inserir registros prefixados como demonstração pelo script `backend/prisma/seed.mjs` e documentar o comando para abrir os Insights preenchidos. **Refs:** RF11, RNF06, CA11.
- [x] **T15 — Carregar as demonstrações no banco local.** Executar `pnpm run db:seed:test` com PostgreSQL local disponível e conferir a casa, o subgrupo, os seis meses, rateios e despesa sem rateio pelo endpoint de Insights. **Refs:** RNF06, CA11.

## Critérios de conclusão

- [ ] **T12 — Conferir a implementação contra a SPEC-007.** Revisar cálculos, filtros, estados de autorização e limites de datas usando os critérios CA01–CA10; registrar divergências ou ajustar os documentos antes de marcar esta SPEC como concluída.

## Incremento: gráficos e acesso pela barra lateral

- [x] **T16 — Especificar gráficos adicionais e navegação própria.** Definir comparação de taxa paga com todas as situações, exposição de atraso por morador, exceção ao filtro de situação e tópico Insights na barra lateral. **Refs:** RF12–RF13, RNF02–RNF04, CA12–CA13.
- [x] **T17 — Implementar ranking do percentual pago.** Consultar situação ALL quando necessário e exibir taxa por morador do menor para o maior, mantendo outros filtros e explicando o indicador.
- [x] **T18 — Implementar gráfico de cotas em atraso.** Agrupar valor e quantidade de cotas vencidas por participação, sob os filtros atuais, com alternativa textual acessível.
- [x] **T19 — Integrar Insights à navegação lateral.** Adicionar seção própria e mapear a rota antes de /finance para preservar o destaque correto.
- [x] **T20 — Conferir os novos critérios.** Revisar CA12 e CA13 com situações ALL, PAID, PENDING e OVERDUE, filtros de período/morador/subgrupo, estados vazios e apresentação acessível.

## Incremento: personalização das visualizações

- [x] **T21 — Especificar escolhas do painel.** Registrar sete blocos personalizáveis, padrão visível, persistência local separada por usuário, restauração e independência dos filtros. **Refs:** RF14, RNF07, CA14.
- [x] **T22 — Persistir preferências por usuário.** Carregar e salvar somente opções de visibilidade em armazenamento local versionado; lidar com usuário trocado e indisponibilidade do navegador sem bloquear a página. **Refs:** RF14, RNF07, CA14.
- [x] **T23 — Implementar controles e exibição seletiva.** Adicionar controles acessíveis, contagem de blocos visíveis, ação de restaurar padrão e orientação quando todos estiverem ocultos. **Refs:** RF14, RNF04, CA14.
- [x] **T24 — Revisar a interação contra CA14.** Conferir por inspeção do fluxo o padrão inicial, cada grupo selecionável, estado de todos ocultos, independência dos filtros e recuperação do padrão; sem alterar agregações financeiras. **Refs:** CA14.

## Ajustes visuais do Financeiro

- [x] **T25 — Ajustar a lista de despesas e o destaque da navegação.** Conferir a lista de Financeiro sem rolagem horizontal, o contraste do item ativo no escuro e a identificação dos botões de comprovante, lembrete e edição. **Refs:** CA10, CA12.

O Chrome confirmou os modos Casa e Pessoal em 390, 1280 e 1600 px, o destaque escuro e a abertura das três ações. Passaram os 20 testes de Financeiro e navegação, além do ESLint e da checagem TypeScript.

O Chrome também confirmou o contraste ao passar o mouse no menu lateral em tema escuro. Os sete testes da navegação lateral passaram.

- [x] **T26 — Centralizar comprovantes e lembretes na tabela.** Alinhar os ícones aos títulos das colunas, inclusive quando já houver arquivos anexados, e conferir a lista em tela estreita. **Ref:** T25. O Chrome confirmou o alinhamento em 1600 px e os rótulos acima dos ícones em 390 px. Os 13 testes de `finance/__test__/page.test.tsx` passaram, assim como ESLint e Prettier no arquivo alterado.
