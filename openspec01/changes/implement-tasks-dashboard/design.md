# Design — Tasks do FullHouse

## Context

O frontend usa Next.js, React e Tailwind; a tela está em `web/features/tasks/components/TasksPage.tsx`. Ela carrega residências, membros e tarefas pela API e separa os contextos Residência/Pessoal; as tarefas pessoais são persistidas pela API autenticada. O backend NestJS/Prisma expõe operações residenciais sob `/residences/:residenceId/tasks`, valida participação ativa e aplica a configuração de criação/edição (`TODOS` ou `LIDERES`). A conclusão é permitida ao responsável e a líderes/administradores; exclusão requer gestor.

O schema contém `definicao_tarefa.escopo` (`CASA`/`INDIVIDUAL`), `visibilidade` (`PUBLICA`/`PRIVADA`), tags, participação responsável, instâncias e entidades/enums de solicitação de troca. A API existente cobria tarefas residenciais; esta change adiciona endpoints autenticados para persistir tarefas individuais. Os protótipos desta mudança são `tasks-screeen.png`, `filter.png` e `new-task.png` em `references/`.

## Goals / Non-Goals

### Goals

- Associar a experiência a uma residência ativa e ao usuário autenticado, sem nomes ou identidades fixos.
- Separar com precisão o contexto residencial do pessoal e aplicar autorização no servidor.
- Oferecer filtros “Todas”, “Atrasadas”, “Pendentes” e “Concluídas”, mantendo concluídas visíveis em “Todas”.
- Tornar claras a atribuição, seleção/cadastro de tags, categorias, horários e lembretes.
- Disponibilizar solicitações de troca com autorização, estados e atualização consistente da atribuição.
- Reproduzir hierarquia visual e comportamento dos protótipos, com acessibilidade e responsividade.

### Non-Goals

- Reescrever outros módulos ou substituir a arquitetura atual.
- Criar uma matriz de permissões nova. Usar a política de criação/edição residencial e papéis existentes.
- Introduzir serviços externos, notificações novas ou migrações sem necessidade demonstrada pelo schema e pelos requisitos.

## Decisions

### D1 — A residência ativa e a identidade autenticada são fontes de contexto

Reutilizar `getTaskResidences` e `getTaskMembers`. A residência selecionada deve pertencer à lista autorizada; mostrar seu nome e membros vindos da API. A troca ou perda de acesso invalida a lista anterior antes de carregar outro contexto. Estado de erro da API não equivale a lista vazia.

Se houver mais de uma residência, manter seleção explícita e permitir alternância. Se nenhuma estiver selecionada, não consultar nem exibir tarefas residenciais e oferecer estado vazio compreensível.

### D2 — Pessoal é um filtro de autorização, não apenas um filtro visual

No contexto “Pessoal”, listar apenas tarefas cujo escopo/proprietário ou responsável corresponde ao usuário autenticado, segundo a semântica real do domínio. O servidor deve filtrar os resultados; ocultar tarefas de outros moradores apenas no navegador não é controle de acesso. As tarefas pessoais são persistidas pela API autenticada `/tasks/personal`, não em `localStorage`.

Corrigir o defeito em que uma tarefa pessoal some ao alternar para “Pessoal”: após salvar, ela deve aparecer no contexto pessoal; ao alternar para outro contexto e voltar, e após recarregar/refazer a consulta, deve continuar listada. Limpar dados do contexto anterior enquanto carrega, sem perder a tarefa persistida.

No contexto residencial, listar tarefas da residência autorizada respeitando `PUBLICA`/`PRIVADA`. Uma tarefa privada só pode ser retornada a seu proprietário/autor e a participantes explicitamente autorizados pela regra de domínio; IDs de usuário e de participação não são intercambiáveis. Para uma troca solicitada pelo responsável atual, revelar ao destinatário escolhido apenas os dados mínimos da tarefa privada necessários para decidir, dentro da própria solicitação; isso não concede acesso à listagem geral da tarefa.

### D3 — Política de criação determina se pode atribuir terceiros

Toda tarefa deve ter responsável; nenhuma política ou contexto permite salvar uma tarefa sem responsável. Para tarefas residenciais, aplicar `creationEditPolicy` (`TODOS`/`LIDERES`) no backend e na UI. Se o usuário puder criar/editar conteúdo residencial, pode selecionar responsáveis ativos da mesma residência ou rodízio válido conforme suporte existente. Se não puder, a interface fixa/seleciona o próprio usuário e a API rejeita tentativa de atribuição alheia. A UI não apresenta opção “Sem responsável” e o backend rejeita campos ausentes ou nulos; rodízio deve conter ao menos um membro ativo válido.

Tarefas do contexto pessoal são sempre do próprio usuário: o responsável é o usuário autenticado e não há seleção de outro morador nem opção sem responsável. A regra exata de quais papéis podem atribuir tarefas sob `TODOS` permanece vinculada ao contrato atual de política; não inferir uma regra nova baseada apenas no nome do papel.

### D4 — O grupo de filtros representa status

Os filtros mutuamente exclusivos são “Todas”, “Atrasadas”, “Pendentes” e “Concluídas”: “Todas” inclui tarefas abertas, atrasadas e concluídas; “Atrasadas” inclui tarefas vencidas ainda não concluídas/canceladas; “Pendentes” inclui pendentes e em andamento; “Concluídas” inclui concluídas. Tarefas canceladas não entram na fila. A contagem e a lista usam os mesmos critérios.

O `filter.png` é referência visual para este mesmo grupo de status: manter as quatro opções acima, aplicando o estilo de abas/pílulas, fundo, arredondamento e estado selecionado do protótipo. Não adicionar um segundo conjunto de filtros por tipo ou visibilidade (por exemplo, “Comunitários”, “Privados” ou “Meus itens”). Filtros de tag/categoria são controles separados e não representam tipo ou visibilidade da tarefa.

Mapear status derivado de atraso e vencimento segundo a fonte temporal já usada pelo backend. Evitar divergência entre a etiqueta `ATRASADA` e tarefas ainda abertas cujo prazo passou.

### D5 — Tags e categorias permanecem simples e legíveis

Ao digitar uma tag, oferecer ação explícita para adicioná-la como chip; sugerir tags existentes no contexto autorizado e permitir selecioná-las. Uma seleção deve mudar de aparência e ser perceptível sem depender somente da cor. Normalizar espaços e evitar duplicatas sem alterar o texto já persistido sem regra do domínio.

Manter a cor de categoria/tarefa armazenada quando existente, garantindo contraste suficiente no texto e nos indicadores. Corrigir visualmente as tags nos cartões da lista e os chips de filtro em “Categorias” no dashboard, comparando-os a `tasks-screeen.png`: texto legível, dimensões e espaçamentos consistentes, contraste, e estados selecionado/não selecionado claros. As tags e sugestões vêm dos dados autorizados; não usar conteúdo ilustrativo fixo. Horário e lembrete recebem contraste de texto e fundo legível. Usar o ícone do lembrete de `new-task.png` conforme os recursos disponíveis no projeto, sem incorporar bitmap quando um ícone vetorial equivalente do conjunto existente reproduzir a referência.

### D6 — Solicitação de troca usa a tarefa da linha e uma pessoa destinatária

Reutilizar `solicitacao_troca_tarefa` e enums atuais (`PENDENTE`, `ACEITA`, `RECUSADA`, `EXPIRADA`, `CANCELADA`; `PONTUAL`/`PERMANENTE`). A tarefa residencial aberta atribuída ao usuário autenticado é a primeira instância da proposta. Todas as tarefas residenciais abertas atribuídas a esse usuário podem iniciar uma troca, sejam públicas ou privadas, fixas, recorrentes ou de rodízio; tarefas do escopo `INDIVIDUAL`, concluídas ou canceladas não podem ser trocadas. Para tarefas recorrentes e de rodízio, a troca afeta somente a instância selecionada; a regra de recorrência/rodízio da definição permanece intacta.

Na linha da tarefa, mostrar somente um botão de ícone de troca. Ao ativá-lo, abrir um compositor compacto com moradores ativos da mesma residência, excluindo o próprio usuário. Se dois moradores tiverem o mesmo nome exibido, mostrar um identificador adicional autorizado que permita distingui-los. A tarefa da linha já identifica o item oferecido pelo solicitante. Depois de escolher o morador, o solicitante pode opcionalmente sugerir uma tarefa residencial aberta e pública atribuída a ele; deixar a sugestão vazia envia o pedido sem preferência. O servidor valida essa sugestão para impedir exposição de tarefas privadas ou de tarefas pertencentes a outro morador/residência.

Ao responder, o destinatário vê a tarefa proposta e o campo da tarefa recíproca. Se o solicitante sugeriu uma tarefa, ela aparece pré-selecionada; o destinatário pode aceitá-la ou escolher outra tarefa residencial aberta atribuída a si. Sem sugestão, o destinatário decide qual tarefa oferecer. A chamada de aceite envia a instância escolhida; a resposta registra a segunda instância e troca as duas responsabilidades atomicamente. Recusa não altera atribuições. Expor ao destinatário somente os dados da tarefa necessários para decidir sobre a troca. Solicitações antigas sem segunda tarefa e sem sugestão permanecem legíveis, mas não podem ser aceitas sem escolher uma tarefa recíproca.

A UI não deve esconder a ação por causa de visibilidade, recorrência ou tipo de atribuição quando a instância residencial aberta está atribuída ao usuário atual. O servidor deve autorizar com base na residência ativa e na responsabilidade atual de cada instância, verificar que a tarefa escolhida pelo destinatário também pertence à mesma residência e está atribuída a ele, e impedir troca de tarefa pessoal, concluída, cancelada ou já comprometida em outra solicitação pendente.

### D7 — A tela usa componentes e feedback consistentes

Atualizar a página e os componentes existentes, evitando uma segunda tela de tarefas. Contexto “Pessoal”/residência fica claro no topo; os quatro filtros de status seguem o tratamento visual de `filter.png`. Tags nos cartões e chips de categoria seguem o protótipo do dashboard e permanecem legíveis. O avatar da conta no cabeçalho de Tarefas deve ser um botão e abrir o mesmo menu da Home (nome, e-mail e “Sair”), com fechamento por clique fora e Escape. Corrigir pluralização de morador, aumentar fontes conforme referências e dar estados de carregamento, vazio e erro distintos. Conservar navegação por teclado, foco visível, labels e feedback anunciado por leitores de tela.

O cabeçalho de Tarefas reutiliza `AppPageHeader`, assim como Home, incluindo os controles de contexto “Pessoal” e residência, o seletor quando houver várias residências, e o menu de conta. O conteúdo abaixo do cabeçalho usa `p-5 md:p-6`, igual ao contêiner de conteúdo da Home, para manter o mesmo início vertical e espaçamento responsivo.

Na tela de Tarefas, ocultar visualmente a barra de rolagem do documento sem desativar a rolagem. Aplicar a regra somente enquanto a tela de Tarefas estiver montada e restaurar o comportamento padrão ao sair da página; áreas internas roláveis mantêm seu comportamento próprio.

## Data Flow

```text
usuário autenticado
  -> carregar residências permitidas e seleção ativa
  -> contexto Residência: carregar membros e tarefas da residência autorizada
       -> filtrar no servidor por residência e visibilidade
  -> contexto Pessoal: carregar somente tarefas pertencentes/atribuídas ao usuário
  -> aplicar filtro de status, busca e tag e renderizar cartões/lista

criação/edição
  -> validar escopo, responsável e política no servidor
  -> persistir tarefa/instância/lembrete
  -> atualizar lista do contexto atual

troca
  -> responsável atual aciona o ícone, escolhe um morador ativo e opcionalmente sugere uma tarefa pública aberta dele
  -> destinatário aceita a sugestão, escolhe outra instância aberta própria ou decide quando não há sugestão; então aceita/recusa
  -> aceite: registrar as duas instâncias e atualizar seus responsáveis em transação
```

## Risks / Trade-offs

- A troca de contexto pessoal precisa refazer a consulta de forma consistente; confirmar que tarefas criadas permanecem visíveis depois de alternar e recarregar.
- A consulta residencial filtra tarefas privadas; a exceção de troca deve limitar a exposição de dados da tarefa privada ao destinatário escolhido e ao conteúdo necessário para responder.
- Política `TODOS`/`LIDERES` controla criação/edição residencial; a regra de permitir autoatribuição ao usuário sem permissão de edição deve ser compatível com o produto e implementada no servidor.
- O alvo de troca é uma coluna opcional compatível com pedidos existentes; a migration foi aplicada no banco local, mas precisa ser aplicada em cada ambiente antes de habilitar o fluxo novo.
- O modelo de troca permanente pode implicar instâncias futuras; não alterar recorrências sem esclarecer esse efeito.
- Reaproveitar cores sem medir contraste pode deixar categorias ilegíveis; conferir texto, chip e foco em fundos reais.

## Migration Plan

1. Inspecionar schema, contratos, telas, política de residência e relações de troca; registrar decisões e lacunas em `tasks.md`.
2. Completar consulta/privacidade e escopo pessoal no backend, adicionar a migration compatível para a segunda tarefa de troca e aplicar a migration antes de liberar o fluxo no banco.
3. Ajustar o frontend para contexto residencial/pessoal, filtros, tags e responsabilidades.
4. Implementar endpoints/serviços de solicitação e resposta a troca com transação e autorização.
5. Ajustar visual, acessibilidade e responsividade às três referências.
6. Verificar contratos, cenários e visual; registrar limites ainda existentes.

Rollback: reverter a interface e endpoints introduzidos preservando tarefas e solicitações já persistidas. Qualquer migração deverá incluir reversão compatível com dados existentes.

## Open Questions

Não há decisões de produto abertas para esta implementação. O escopo segue as regras existentes: `TODOS`/`LIDERES` controla atribuição a terceiros; tarefas pessoais são persistidas sob o usuário autenticado; solicitações propõem duas tarefas e só trocam uma ocorrência, sem alterar definições recorrentes; troca permanente fica fora do escopo. A tarefa privada permanece isolada, com exceção dos dados mínimos compartilhados com o destinatário escolhido para responder a uma solicitação.

## Visual References

As referências principais estão em `openspec/changes/implement-tasks-dashboard/references/`:

- `tasks-screeen.png`: composição do painel e cartões/lista de tarefas.
- `filter.png`: aparência visual do grupo de filtros de status “Todas”, “Atrasadas”, “Pendentes” e “Concluídas”. Não implementar filtros adicionais de tipo/visibilidade.
- `new-task.png`: formulário e apresentação do lembrete.

Reproduzir os protótipos mantendo o design system FullHouse. Textos, nomes de morador, residência, tags e quantidades devem vir de dados autorizados ou de estados vazios, nunca de conteúdo ilustrativo fixo.
