# Análise comparativa das três sprints

## Visão geral

| Sprint | Problema principal | Desafios técnicos para analisar |
| --- | --- | --- |
| 1 — Despensa | Cadastrar e consultar itens e acompanhar o estoque da casa | Regras de propriedade e privacidade, validação dos dados e consistência do saldo ao registrar movimentações. |
| 2 — Lista de compras | Compartilhar itens entre moradores e controlar o ciclo pendente/comprado | Concorrência entre moradores, atualização por versão, transições de estado, validações de quantidade/unidade e resposta da interface a conflitos. |
| 3 — Insights e qualidade | Resumir despesas para apoiar decisões e endurecer controles do sistema | Agregações financeiras corretas, filtros e datas, autorização transversal, proteção de login e cobertura de regressão em vários módulos. |

## Como as soluções diferem

Na **Sprint 1**, o núcleo do problema é manter os dados da despensa coerentes. Uma saída não pode ultrapassar o saldo; itens privados e itens atribuídos a outro morador têm regras de visibilidade e operação próprias. A solução atravessa formulário, API, serviço, repositório e banco de dados. A documentação da sprint registra testes de unidade, HTTP e interface.

Na **Sprint 2**, o desafio passa a ser a colaboração concorrente. Dois moradores podem tentar editar, comprar ou remover o mesmo item; a versão do registro permite detectar a atualização obsoleta e informar o conflito. A especificação também define estados, validação do formulário, itens duplicados e a separação entre lista, despensa e financeiro.

Na **Sprint 3**, o painel precisa transformar despesas e rateios em indicadores sem misturar o pagamento da conta inteira com as cotas individuais. Períodos, situação, subgrupo e morador afetam os resultados; as datas precisam seguir o fuso local. A mesma sprint inclui mudanças de autorização e autenticação e a ampliação de testes unitários para áreas do backend e frontend.

## Dificuldades para discutir com o professor

1. **Regras de negócio:** comparar o cálculo do saldo da despensa com as transições e versões da lista de compras.
2. **Concorrência:** observar o bloqueio/consistência das movimentações de estoque na Sprint 1 e o controle otimista por versão na Sprint 2.
3. **Segurança:** seguir como autenticação, vínculo ativo com a residência e permissões aparecem no serviço e nas rotas; na Sprint 3, considerar também bloqueio de tentativas de login.
4. **Dados agregados:** verificar como o Insights aplica filtros e separa valores por cotas, contas pagas e atrasos, e quais limites a especificação registra.
5. **Verificação:** comparar os testes que exercitam regras isoladas com testes HTTP e de interface. Os números gerais de cobertura não significam que cada fluxo esteja testado.

As dificuldades acima são pontos de análise inferidos pelas regras e estruturas presentes no código e nas especificações; não são uma nota ou medição objetiva de esforço.

## Rastreabilidade dos snapshots

- Sprint 1: merge `b47147c` (20/10/2026); documentação/evidências `fd106df`.
- Sprint 2: merge `baf136f` (02/11/2026); especificação OpenSpec histórica `openspec/changes/add-shopping-list`.
- Sprint 3: Insights `b97ee26`; autorização residencial `e1abb9f`; autenticação/lockout `ca13301`; revisão de cobertura `f2da42d`.
