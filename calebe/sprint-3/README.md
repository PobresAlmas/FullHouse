# Sprint 3 — Insights, segurança e testes

Esta sprint está separada em quatro recortes para que o professor possa comparar cada tipo de trabalho:

- `insights/`: especificação `openspec02/spec/007-insights-financeiros/`, agregado no backend, cliente, página, navegação e teste relacionado.
- `seguranca-autorizacao/`: mudanças no controle de edição de conteúdo residencial e nos serviços e telas que aplicam permissões.
- `seguranca-autenticacao/`: bloqueio após falhas de login, limite de requisições e testes unitários, HTTP e de migração.
- `cobertura-testes-unitarios/`: testes unitários adicionados ou ampliados no backend e frontend, além da pequena alteração de componente necessária ao teste.

O documento [Segurança e cobertura](SEGURANCA_E_COBERTURA.md) detalha os controles de segurança e os números de teste registrados no projeto.

## Pontos para análise

O Insights agrega valores de despesas e rateios sob filtros e regras de autorização; a especificação documenta critérios, decisões de datas e limites dos indicadores. As correções de segurança atuam em fluxos diferentes: a autorização protege operações por residência e a autenticação reduz tentativas repetidas de login. O recorte de cobertura mostra testes em módulos de autenticação, quartos, tarefas, despesas, pets e residências.

Os testes unitários selecionados vêm da revisão `f2da42d` (15/11/2026). O relatório do projeto nessa revisão registra 375 testes de backend em 50 arquivos e 208 testes de frontend em 64 arquivos. Esses totais são do repositório inteiro, não somente dos testes deste recorte. Schema/migrações, testes HTTP/e2e e de integração foram omitidos.

## Snapshots

- Insights e OpenSpec 02: `b97ee26` (26/11/2026).
- Autorização residencial: `e1abb9f` (26/11/2026).
- Lockout e cobertura de rotas de autenticação: `ca13301` (15/11/2026); o limite global de requisições foi introduzido em `a73a6c9`.
- Cobertura de testes: `f2da42d` (15/11/2026).

Os recortes preservam versões de commits diferentes. Isso facilita atribuir as mudanças, mas eles não formam uma cópia executável isolada do projeto.
