# Triagem dos testes manuais do FullHouse

Este arquivo organiza o que foi observado nos testes em pacotes de trabalho.
Os IDs HOME e AUT-01 a AUT-13 identificam os cenários originais. Os IDs G01 a G09
identificam os grupos. Cada item pode ser entregue e revisado separadamente.

## Contas usadas

- **A** — conta que criou e gerencia a casa.
- **B e C** — contas que testaram o ingresso e as operações de moradores.

Para conferir permissões, testar também com um morador somente leitura e com
uma conta sem vínculo. Registrar qual política de edição estava ativa.

## Ordem sugerida

### Etapa 1 — Corrigir fluxos que falharam nos testes

- [G01 — Conta, fotos de perfil e recuperação de senha](#g01--conta-fotos-de-perfil-e-recuperação-de-senha)
- [G02 — Dados da Home e fluxos de Tarefas](#g02--dados-da-home-e-fluxos-de-tarefas)
- [G03 — Respostas e reagendamento de reuniões](#g03--respostas-e-reagendamento-de-reuniões)

### Etapa 2 — Resolver regras que afetam mais de uma conta

- [G04 — Ciclo da vaga de quarto e dos convites](#g04--ciclo-da-vaga-de-quarto-e-dos-convites)
- [G05 — Matriz de permissões](#g05--matriz-de-permissões)
- [G06 — Quantidades da lista de compras e da despensa](#g06--quantidades-da-lista-de-compras-e-da-despensa)

### Etapa 3 — Melhorar a interface e planejar funcionalidades novas

- [G07 — Notificações e avisos da Home](#g07--notificações-e-avisos-da-home)
- [G08 — Layout, tema, confirmações e navegação](#g08--layout-tema-confirmações-e-navegação)
- [G09 — Lista de compras pessoal e upload de foto de pet](#g09--funcionalidades-novas)

G01, G02 e G03 podem andar em paralelo. G05 pode começar pela definição da
matriz de permissões enquanto G04 e G06 avançam. Em G07, validar os links e
ações de convites após G04. Em G08, revisar os botões de excluir depois de G05.
Dividir G08 e G09 por módulo para evitar um PR que misture várias telas.

## G01 — Conta, fotos de perfil e recuperação de senha

**Origem** — AUT-01, AUT-03, AUT-06.

**Onde atuar** — `web/app/(auth)/upload-photo/page.tsx`, `web/features/profile/`,
`web/features/auth/components/ForgotPasswordForm.tsx`, `backend/src/users/`,
`backend/src/storage/`, `backend/src/password-reset/` e `backend/src/email/`.

**Destino** — tarefas separadas de autenticação e perfil. Abrir spec somente se
mudar o comportamento esperado do fluxo, por exemplo novos requisitos de foto.

- [ ] **G01.1** — Cadastro com foto. O upload pareceu concluir, mas Continuar não
  respondeu. Conferir resposta do upload, atualização da sessão e destino
  após clicar. Concluir quando a conta nova puder avançar após enviar a
  foto e a interface informar o que aconteceu se o envio falhar.
- [ ] **G01.2** — Foto do perfil. A troca retornou `Internal server error`. Conferir a
  requisição para `/users/me/avatar`, o erro do backend e o armazenamento
  local. Concluir quando a foto atualiza no perfil e nas áreas que usam o
  avatar, com feedback visível de falha e opção de repetir.
- [ ] **G01.3** — Esqueci a senha. Foi exibido “Não foi possível enviar o código agora.
  Verifique o serviço de e-mail e tente novamente.” Separar falha de
  configuração do Resend/remetente de falha no fluxo do app. Conferir a
  configuração com o [README](../README.md) e testar um endereço de teste autorizado.
  Concluir quando o código chega e o fluxo avança em ambiente configurado.
  Registrar no setup se a causa for apenas de ambiente.

## G02 — Dados da Home e fluxos de Tarefas

**Origem** — HOME, AUT-05, AUT-05 EXC.

**Onde atuar** — `web/features/home/components/HomePage.tsx`,
`web/features/home/lib/home-metrics.ts`, `backend/src/home/`,
`web/features/tasks/components/TasksPage.tsx`, `web/features/tasks/api/` e
`backend/src/tasks/`, incluindo `backend/src/tasks/task-exchange.service.ts`.

**Destino** — registrar na spec da Home ou de Tarefas durante sua migração para a
OpenSpec 02. Referências atuais: [implement-home-dashboard](../openspec01/changes/implement-home-dashboard/proposal.md) e
[implement-tasks-dashboard](../openspec01/changes/implement-tasks-dashboard/proposal.md). Correções pontuais podem
ficar como tarefas vinculadas a essas referências.

- [ ] **G02.1** — Atrasos na Home. C viu “Você tem tarefa atrasada” para uma tarefa de B.
  Repetir no modo Casa e no Pessoal. Se o cartão usa dados da casa, indicar
  que o atraso é da casa. Se for um resumo pessoal, contar somente as
  tarefas que pertencem ao contexto de C. Conferir com as duas sessões.
- [ ] **G02.2** — Tarefa privada. Depois de B criar uma tarefa privada, a parte privada
  sumiu no teste. Conferir em qual contexto e filtro a tarefa foi criada
  e em qual ela reaparece após salvar e recarregar. B precisa encontrar
  sua tarefa autorizada. A e C devem continuar sem vê-la na lista geral.
- [ ] **G02.3** — Modo Pessoal. O teste registrou “falta tarefas pessoais”, mas o código
  já tem um contexto Pessoal e uma API própria. Validar se a entrada fica
  acessível com e sem casa e se criação, lista e recarga funcionam.
  Corrigir a lacuna que for reproduzida.
- [ ] **G02.4** — Troca com contraproposta. C conseguiu escolher outra tarefa ao
  aceitar o pedido de B e faltou aviso. O fluxo de Tarefas já permite
  substituir a sugestão. Conferir se o par final fica claro antes do
  aceite e se B recebe retorno visível sobre a tarefa efetivamente
  trocada. Registrar na spec se o retorno tiver de ser uma notificação.
- [ ] **G02.5** — Feedback fora da área visível. Erros e avisos aparecem no topo
  enquanto a pessoa está mais abaixo. Garantir que o resultado seja
  visível após a ação, inclusive em tela estreita e usando teclado.

## G03 — Respostas e reagendamento de reuniões

**Origem** — AUT-11 e AUT-11 EXC.

**Onde atuar** — `web/app/(private)/meetings/page.tsx`,
`web/features/house-collaboration/api/meetings.api.ts` e `backend/src/meetings/`.

**Destino** — [SPEC-002](../openspec02/spec/002-colaboracao-da-casa/requirements.md), requisitos RF06–RF08 e critérios CA06–CA09. Registrar
correções e evidências em `openspec02/spec/002-colaboracao-da-casa/tasks.md`.

- [ ] **G03.1** — Confirmar e recusar. Os botões não funcionaram no teste. Conferir a
  resposta do convidado ativo, o status após salvar e a atualização para
  outros moradores. Testar os dois botões em uma reunião recém-criada.
- [ ] **G03.2** — Reagendar sem apresentar duas reuniões ativas. A spec mantém o
  evento original no histórico como REAGENDADA e cria um substituto.
  Conferir se a sensação de duplicação vem da lista ou de dados gravados
  em duplicidade. Concluir quando só o substituto é acionável e o
  original está identificado como histórico.
- [ ] **G03.3** — Convites da reunião substituta. Após reagendar, as ações ficaram
  indisponíveis. Validar que os convites novos pertencem ao evento
  substituto e ficam pendentes para os moradores elegíveis. Um convidado
  deve conseguir confirmar ou recusar no novo evento.

## G04 — Ciclo da vaga de quarto e dos convites

**Origem** — AUT-04.

**Onde atuar** — `web/features/rooms/components/HouseRoomListings.tsx`,
`web/features/rooms/components/RoomNegotiationPage.tsx`, demais componentes
de detalhes em `web/features/rooms/` e `backend/src/rooms/`. Revisar o schema
Prisma se a capacidade da vaga precisar de proteção no banco.

**Destino** — [SPEC-001](../openspec02/spec/001-anunciar-quarto/requirements.md) para anúncio e detalhes, [SPEC-004](../openspec02/spec/004-negociacao-e-convites/requirements.md) para negociação e
convite. Registrar a regra de ocupação e o ciclo de encerramento em
requirements.md antes de implementar. Referências em `openspec02/spec/`.

- [ ] **G04.1** — Detalhes da vaga. B viu o anúncio, mas os valores apareciam sem
  identificação clara. Rotular localização, valor, tipo de moradia,
  convivência, pets e demais campos exibidos. Revalidar as opções de
  privacidade de contato e endereço nos detalhes de B e C.
- [ ] **G04.2** — Uma vaga não pode ser ocupada duas vezes. B e C aceitaram a mesma
  vaga no teste. Repetir com o mesmo anúncio e verificar o aceite dos
  convites e o vínculo de ambos. Manter separado o aceite de interesse
  do aceite de entrada. Para uma vaga com capacidade de uma pessoa, o
  segundo aceite precisa ser bloqueado no servidor, inclusive se as
  respostas chegarem juntas. Definir o destino dos convites pendentes
  e quando uma vaga ocupada volta a ficar disponível.
- [ ] **G04.3** — Encerrar ou excluir o anúncio. A ação não apareceu na aba Moradores.
  A API já possui DELETE com fechamento do anúncio. Definir se a ação
  deve ser apresentada como Encerrar ou incluir exclusão e o que fazer
  com interesses, conversas e convites pendentes em cada etapa. Testar
  autorização do anunciante, o estado na busca e o efeito para B/C.
  Conferir separadamente anúncios sem interesse, com interesse,
  negociação, convite pendente e convite já aceito.

## G05 — Matriz de permissões

**Origem** — AUT-07 EXC, AUT-08 EXC, AUT-10, AUT-12 e AUT-13.

**Onde atuar** — `backend/src/residences/residence-access.service.ts`,
`backend/src/shopping-list/`, `backend/src/pantry/`, `backend/src/house-rules/`,
`backend/src/pets/` e os controles das respectivas telas.

**Destino** — [SPEC-003](../openspec02/spec/003-configuracoes-da-casa/requirements.md) para política global e acesso individual, [SPEC-002](../openspec02/spec/002-colaboracao-da-casa/requirements.md) para
regras da casa e os requisitos da Sprint 02 em `docs/sprints/sprint02/Calebe/`
para lista de compras e categorias. Uma regra de produto nova deve entrar
na spec do módulo e na matriz antes da implementação.

- [x] **G05.1** — Lista compartilhada. B pôde editar item de outra pessoa. Em outra
  tentativa, a exclusão de item alheio retornou erro. A documentação
  permite operações da lista a moradores ativos. Repetir com o mesmo
  item, versões atuais e papéis conhecidos. Registrar se edição e
  exclusão devem ser de todos, do autor ou de gestores.
- [x] **G05.2** — Categorias da despensa. Uma conta sem papel de gestor conseguiu
  excluir categoria. O serviço usa a política de criação e edição da
  casa. Conferir em TODOS, LIDERES e com permissão individual. Definir
  se exclusão de categoria vazia segue essa política ou é exclusiva da
  gestão. Categoria em uso deve continuar protegida.
- [x] **G05.3** — Mural da casa. O teste registrou que qualquer pessoa podia criar uma
  regra. A versão anterior da [SPEC-002](../openspec02/spec/002-colaboracao-da-casa/requirements.md) previa cadastro por morador ativo. Verificar
  conta sem vínculo e morador somente leitura. Se criar ou editar
  passar a exigir outro papel, atualizar RF05/CA05 e alinhar API e tela.
- [x] **G05.4** — Pets. O teste levantou que outras pessoas conseguem alterar ou
  excluir um pet. Verificar as duas operações separadamente. O serviço
  usa a política de edição para alterar e exige gestor para excluir.
  Comparar o papel e o contexto das contas com as ações que aparecem
  e com a autorização efetiva no servidor.

Concluir o grupo com os papéis e operações autorizados registrados por
escrito. Em cada módulo, repetir com autor, outro morador, gestor, morador
somente leitura e pessoa sem vínculo conforme o cenário.

### Verificação de G05 — 23/11/2026

A [matriz da SPEC-003](../openspec02/spec/003-configuracoes-da-casa/requirements.md#matriz-de-permissões-de-g05)
registra as permissões. Na API com PostgreSQL de teste, A era líder, B herdava
a política da casa, C tinha edição individual, L tinha somente leitura e X
era administrador de outra casa, sem vínculo com a residência testada.

| Item | Resultado observado na API |
| --- | --- |
| G05.1 | Com `TODOS`, B editou e excluiu o mesmo item de A com a versão atual. A exclusão usando a versão anterior à edição retornou `409`. L consultou a lista e recebeu `403` ao tentar criar, editar, marcar como comprado ou excluir. C marcou um item como comprado e o reabriu. |
| G05.2 | B excluiu uma categoria vazia com `TODOS` e recebeu `403` com `LIDERES`. C renomeou e excluiu uma categoria vazia devido à edição individual. A exclusão de categoria em uso retornou `409` para A e B. |
| G05.3 | B e L consultaram o mural e A criou e editou uma regra. B recebeu `403` ao tentar criar. C recebeu `403` ao tentar editar. |
| G05.4 | B cadastrou o pet, C editou e L recebeu `403` ao tentar editar. B e C receberam `403` ao tentar excluir o pet, e A o excluiu. O histórico de cuidados também permitiu edição por C e remoção por A. |

A troca da política global e a volta de C para a herança foram verificadas
pela API. X recebeu `404` ao tentar consultar ou criar conteúdo nos quatro módulos.
Os comandos e resultados dos testes automatizados estão nas
[tarefas da SPEC-003](../openspec02/spec/003-configuracoes-da-casa/tasks.md#g05--matriz-de-permissões).

Para reproduzir pela interface, abra **Configurações → Permissões** na sessão
de A. Alterne a política global e os acessos de B, C e L. Recarregue os módulos
nas sessões correspondentes e compare as ações de cada conta com a matriz.

## G06 — Quantidades da lista de compras e da despensa

**Origem** — AUT-07 EXC e AUT-08.

**Onde atuar** — `web/app/(private)/shopping-list/page.tsx`,
`web/features/pantry/components/PantryMovementModal.tsx`, DTOs e serviços
em `backend/src/shopping-list/` e `backend/src/pantry/`.

**Destino** — requisitos da lista de compras e da despensa. Registrar a regra
por unidade antes de mexer na validação.

- [ ] **G06.1** — Lista de compras. PACOTE aceitou quantidade fracionária. Validar
  PACOTE como inteiro na criação e na edição, inclusive quando a mudança
  é somente na unidade. Confirmar a regra para UNIDADE na matriz.
- [ ] **G06.2** — Despensa. Entrada e saída de itens de contagem aceitaram decimais.
  Conferir quais unidades exigem inteiro e aplicar a regra ao cadastro,
  edição e movimentação conforme o contrato. Preservar frações para
  unidades que medem massa ou volume, conforme a regra definida.
- [ ] **G06.3** — Compatibilidade. Verificar se há registros antigos fracionários
  nas unidades de contagem. Definir como editá-los sem arredondar ou
  alterar o estoque silenciosamente. Testar inteiro válido, decimal
  inválido e tentativa de retirar mais que o disponível.

## G07 — Notificações e avisos da Home

**Origem** — AUT-04, HOME e AUT-13.

**Onde atuar** — `web/features/notifications/components/NotificationBell.tsx`,
`web/features/notifications/api/`, `web/features/settings/components/SettingsPage.tsx`,
`web/features/home/components/HomePage.tsx` e `backend/src/notifications/`.

**Destino** — [SPEC-003](../openspec02/spec/003-configuracoes-da-casa/requirements.md) para o centro compartilhado. [SPEC-001](../openspec02/spec/001-anunciar-quarto/requirements.md)/[SPEC-004](../openspec02/spec/004-negociacao-e-convites/requirements.md) para links
do anúncio e ações de convite. O conceito de avisos da Home entra na spec
da Home após definir a origem dos dados.

- [ ] **G07.1** — Área clicável. Somente o título da notificação abriu o destino.
  Permitir que o cartão clicável abra a notificação sem disparar
  navegação ao usar um controle interno de aceitar, recusar ou marcar
  como lida. Conferir com teclado.
- [ ] **G07.2** — Fechamento. O teste registrou que o aviso só sumia ao clicar no
  ícone. Identificar se era o painel do sino ou um feedback temporário.
  Para o painel, conferir fechamento por clique fora e Escape. Para o
  feedback temporário, definir duração e controle conforme o padrão do app.
- [ ] **G07.3** — Tema escuro. Distinguir notificações lidas e não lidas com
  contraste e indicação de estado que não dependa somente da cor.
- [ ] **G07.4** — Marcar todas como lidas. Definir que a ação inclui os avisos
  ainda não lidos da própria conta, mesmo fora da página atual.
  Atualizar sino, central e contador sem tratar convites pendentes
  como aceitos ou recusados. Registrar como requisito novo da [SPEC-003](../openspec02/spec/003-configuracoes-da-casa/requirements.md).
- [ ] **G07.5** — Avisos da Home. O teste não identificou de onde vêm os avisos
  e a tela atual informa que os avisos da residência não estão
  disponíveis. Definir se o cartão deve mostrar avisos da casa, apontar
  para a central de notificações ou ficar oculto até existir uma fonte.
  Mural de Regras, avisos coletivos e notificações pessoais são fluxos
  distintos. Registrar a escolha e a autorização esperada na spec da Home.

## G08 — Layout, tema, confirmações e navegação

**Origem** — HOME, AUT-05, AUT-06, AUT-07, AUT-08, AUT-12 e AUT-13.


**Destino** — tarefas de interface por módulo nas specs correspondentes.
Em componentes compartilhados, registrar quais páginas serão afetadas e
conferir cada tela em claro, escuro e viewport estreita quando aplicável.

- [ ] **G08.1** — Home. Remover a rolagem horizontal da página. Conferir
  HomePage.tsx, `web/components/layout/AppShell.tsx` e `web/app/globals.css`.
  Conferir textos longos, cartões e seletor sem cortar conteúdo.
- [ ] **G08.2** — Tarefas. Diferenciar finais de semana no calendário em modo claro
  e manter destaque legível para tarefas concluídas em modo escuro.
  Conferir a tela em `web/features/tasks/components/TasksPage.tsx` e o
  calendário em `web/features/tasks/components/TaskCalendar.tsx`.
- [ ] **G08.3** — Perfil. Conferir como a cor escolhida aparece com e sem foto.
  Definir se a cor aparece com foto ou apenas como fundo do avatar.
  Tornar o ícone de casa um link identificado para a Home onde for
  usado para navegação. Conferir `web/features/profile/components/ProfilePage.tsx`,
  `web/components/ui/user-avatar.tsx` e o layout compartilhado.
- [ ] **G08.4** — Lista de compras. Dar destaque ao botão de editar no modo escuro.
  Trocar a confirmação do navegador por um diálogo do aplicativo, com
  confirmação e cancelamento. Conferir `web/app/(private)/shopping-list/page.tsx`.
- [ ] **G08.5** — Despensa. Trocar a confirmação de exclusão de categoria por diálogo
  do app. Corrigir o filtro que fica cortado quando o card é pequeno.
  Conferir `web/app/(private)/pantry/page.tsx`, os componentes em
  `web/features/pantry/components/` e o seletor compartilhado.
- [ ] **G08.6** — Pets. Identificar onde apareceu “localização não informada” e a qual
  dado se refere. Definir se o campo tem origem válida e deve ser exibido.
  Conferir `web/app/(private)/pets/page.tsx` e a resposta de `backend/src/pets/`.
- [ ] **G08.7** — Configurações. Revisar o ícone pequeno de engrenagem sem ação.
  Se for decorativo, ajustar a apresentação para não parecer clicável.
  Conferir `web/features/settings/components/SettingsPage.tsx` e o cabeçalho.

## G09 — Funcionalidades novas

**Origem** — AUT-07 e AUT-12.


**Destino** — abrir duas specs independentes na OpenSpec 02, com requirements.md,
design.md e tasks.md. Definir escopo antes de numerar.

- [ ] **G09.1** — Lista de compras pessoal. Definir acesso com e sem residência,
  isolamento por conta, transições dos itens e o que é compartilhado com
  o fluxo residencial. Pontos de partida: `web/app/(private)/shopping-list/page.tsx`,
  `web/features/shopping-list/`, `backend/src/shopping-list/` e schema Prisma.
- [ ] **G09.2** — Upload de foto de pet. A interface atual usa um campo “URL da foto”.
  Especificar seleção de arquivo, prévia, remoção, falhas e permissões de
  edição. Considerar as fotos antigas que já usam URL. Pontos de partida:
  `web/app/(private)/pets/page.tsx`, `web/features/pets/api/pets.api.ts`,
  `backend/src/pets/` e `backend/src/storage/`. Aproveitar o que for
  confirmado em G01 sobre o fluxo de armazenamento local.

## Cenários que passaram e devem ser repetidos

- **AUT-01** — Cadastro de A, B e C com credenciais válidas. E-mail duplicado, e-mail inválido e senha inválida retornaram os erros esperados. A conclusão com foto está em G01.
- **AUT-02** — Login com credenciais válidas. E-mail incorreto e senha incorreta foram rejeitados com mensagem.
- **AUT-04** — A criou a casa, publicou, abriu e editou o anúncio. B abriu seus detalhes, enviou interesse e recebeu confirmação. C repetiu o fluxo. O aviso apareceu para A e A aceitou os interesses. B e C viram a atualização no anúncio e receberam os avisos seguintes. A entrada dupla pela mesma vaga está em G04.
- **AUT-05** — A criou e concluiu sua tarefa, com atualização aos outros usuários. A enviou troca sem sugestão e C escolheu uma tarefa e aceitou. B enviou troca com sugestão e C aceitou. A troca atualizou as atribuições. Busca e filtro por calendário funcionaram.
- **AUT-05 EXC** — Outros moradores não viram a tarefa privada de B. O sistema rejeitou B criar tarefa privada para terceiro e concluir a tarefa de A. O retorno da contraproposta fica em G02.
- **AUT-06** — Nome, apelido, e-mail com confirmação de senha e cor foram alterados. As mudanças apareceram para outros usuários. Alterar e-mail com senha incorreta mostrou erro.
- **AUT-07** — A adicionou item à lista e outros usuários viram a atualização. Dados inválidos mostraram erro. O erro na tentativa de excluir item alheio deve ser reproduzido em G05 antes de tratá-lo como regra confirmada.
- **AUT-08** — B adicionou item comunitário e os demais viram. C adicionou item privado e só C o viu. A aumentou quantidade e os outros viram a atualização. Os filtros funcionaram, com problema visual em G08. Categoria já excluída, categoria em uso e retirada acima da quantidade disponível foram rejeitadas.
- **AUT-09** — Mensagem do chat apareceu para os outros moradores. Regressão da [SPEC-002](../openspec02/spec/002-colaboracao-da-casa/requirements.md), sem correção aberta nesse teste.
- **AUT-10** — A cadastrou regra com sucesso. O alcance da permissão está em G05.
- **AUT-11** — A cadastrou reunião futura. Reunião com data passada mostrou erro.
- **AUT-12** — C cadastrou pet e a atualização apareceu para outro usuário.
- **AUT-13** — No cenário testado, as ações de gestão da casa e das vagas ficaram com o gestor. Alterar nome da casa e permissões foi possível pelo fluxo de gestão. Notificações e atualização para os usuários funcionaram. Melhorias do sino em G07 e do ícone em G08.

## Como transformar o plano em entrega

1. Escolher um grupo ou um subitem independente por PR. Usar o ID, por exemplo G03.1, no título da tarefa para encontrar o relato original.
2. Para corrigir um comportamento já especificado, adicionar a tarefa ao tasks.md do módulo e apontar para o critério existente.
3. Se o grupo mudar uma regra ou acrescentar uma função, definir o comportamento em requirements.md, registrar a integração em design.md e dividir a execução em tasks.md. Aproveitar a spec existente quando for extensão do mesmo fluxo. Usar spec nova para uma função independente.
4. Ao retestar, registrar conta e papel, contexto, passos, resultado e evidência. Repetir os cenários que passaram e podem ser afetados.
