# SPEC-006 — Contextos da Home e de Tarefas

**Origem:** G02 da [triagem dos testes manuais](../../../docs/triagem-testes-manuais.md#g02--dados-da-home-e-fluxos-de-tarefas).

## Objetivo

Identificar a quem pertencem os atrasos da Home, tornar tarefas privadas e pessoais encontráveis no contexto correto e mostrar o resultado de ações e trocas.

## História de usuário

Como usuário, quero distinguir a rotina da casa da minha rotina pessoal. Como morador, quero conferir quais tarefas serão trocadas e saber qual atribuição ficou comigo.

## Pré-condições

- Sessão autenticada para abrir a Home e Tarefas.
- Participação ativa na residência para consultar tarefas da casa ou participar de trocas.

## Requisitos funcionais

- **RF01 — Atrasos por contexto.** Na Home da residência, identificar a contagem como atraso da casa. No modo Pessoal, contar as tarefas individuais da conta e as tarefas da casa sob sua responsabilidade. Os atalhos da Home Pessoal abrem Tarefas no contexto Pessoal.
- **RF02 — Tarefa privada residencial.** Ao escolher Privada, atribuir a tarefa de forma fixa ao morador autenticado. Identificar a tarefa pela indicação **Privada** na lista autorizada. Após salvar, limpar filtros que poderiam esconder a tarefa. Na lista e no detalhe, a API usa o responsável atual de cada ocorrência para autorizar a visualização, inclusive depois de uma troca.
- **RF03 — Tarefas pessoais.** Permitir abrir Tarefas pelo menu e pelo modo Pessoal da Home mesmo sem residência. Permitir abrir e recarregar o contexto Pessoal usando a URL. A lista pessoal inclui as tarefas individuais da conta autenticada e as ocorrências residenciais atribuídas à conta em uma residência ativa. Identificar estas ocorrências com **Da casa** e permitir concluí-las ou reabri-las pela própria lista.
- **RF04 — Resposta de troca.** Antes do aceite, mostrar quais tarefas ficarão com cada pessoa. Se o destinatário trocar a tarefa sugerida, informar que o solicitante ficará com a escolha final. No aceite efetivado, registrar uma notificação interna para o solicitante ativo com o resultado da atribuição.
- **RF05 — Feedback de ação.** Apresentar confirmação ou erro de ação na área visível da página de Tarefas, inclusive em tela estreita. No formulário, levar o foco à mensagem de validação quando houver erro.

## Requisitos não funcionais

- **RNF01 — Privacidade.** Usar a sessão para consultas pessoais. Respeitar a participação, as permissões e a visibilidade ao consultar tarefas residenciais. O aviso da troca é direcionado somente ao solicitante do pedido.
- **RNF02 — Consistência.** Uma resposta de consulta anterior não pode substituir os dados de outro contexto. O aviso do aceite é persistido na mesma transação que realiza a troca.
- **RNF03 — Acessibilidade.** Indicar o contexto selecionado e manter o tamanho e a posição dos botões ao alternar. Mostrar a foto do responsável quando disponível e usar a inicial com contraste nos temas claro e escuro. Anunciar falhas e confirmações e permitir fechar a mensagem de ação usando o teclado.

## Regras de negócio

1. Tarefas individuais pertencem à conta. Tarefas da casa mantêm o escopo residencial quando exibidas no modo Pessoal. Tarefas privadas da casa são visíveis na lista e no detalhe para quem atualmente responde pela ocorrência.
2. A permissão de criar ou editar tarefas residenciais considera o papel e a permissão individual da participação.
3. A sugestão de troca pode ser alterada antes de aceitar. A tarefa efetivamente selecionada é a registrada no pedido e informada ao solicitante.

## Critérios de aceitação

- **CA01 — Atraso de outro morador.** Com atraso de B e sem pendência individual de C, C vê a contagem como atraso da casa. A tarefa de B não aparece no modo Pessoal de C.
- **CA02 — Tarefa privada após salvar e trocar.** B salva e encontra a tarefa privada em Casa e Pessoal. Depois de aceitar uma troca, C (novo responsável) passa a vê-la nos dois contextos. B e os demais moradores ficam sem acesso pela listagem e pelo detalhe.
- **CA03 — Acesso e recarga.** Conta sem casa alterna entre Início e Pessoal na Home e abre a lista de Tarefas. Uma conta com casa alterna os contextos. Recarregar `/tasks?scope=personal` mantém a lista pessoal. Uma consulta de residência com falha permite carregar as tarefas pessoais.
- **CA04 — Aceitar outra tarefa.** C vê o par final ao substituir a sugestão de B. Depois do aceite, o pedido e o aviso do sino de B mostram a escolha efetiva. Uma resposta rejeitada pelo servidor não cria o aviso de aceite.
- **CA05 — Ação abaixo do topo.** Erros e confirmações de ação podem ser lidos e dispensados sem voltar ao topo. A mensagem de erro do formulário fica focada após a validação.
