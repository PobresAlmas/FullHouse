# Design — Home do FullHouse

## Context

A aplicação possui frontend Next.js (App Router, React e Tailwind) e backend NestJS com Prisma. Hoje `web/app/(private)/page.tsx` redireciona `/` para `/finance`; `AppSidebar` ainda desabilita a opção Home. Existem clientes HTTP de residências, tarefas e despesas. O backend já expõe `GET /residences`, `GET /residences/:residenceId/tasks`, `GET /residences/:residenceId/tasks/members` e `GET /expenses`, com autenticação JWT; não expõe `POST /residences` no código inspecionado.

A mudança cobre os estados dos quatro protótipos: sem residência (Home e seleção visual de Perfil), Home da residência e Home pessoal. O texto do seletor residencial **SHALL** ser o nome persistido da residência, nunca o nome de exemplo do protótipo. Os protótipos são a referência de aparência e hierarquia visual; dados de demonstração não serão usados como dados reais.

## Goals / Non-Goals

### Goals
- Substituir o redirecionamento da Home por uma experiência funcional nos estados previstos.
- Reproduzir com fidelidade razoável o layout, hierarquia, cores, espaçamento, componentes e estados dos protótipos em desktop, adaptando a dispositivos menores.
- Permitir criar a primeira residência e associar o criador com papel de gestão.
- Permitir alternar entre contexto da residência selecionada e contexto Pessoal, com isolamento correto dos dados.
- Exibir cartões de tarefas, contas, avisos, resumo semanal e membros apenas com dados reais autorizados, ou estados vazios explícitos.
- Preservar a arquitetura e os contratos já utilizados em outras páginas.

### Non-Goals
- Reescrever Financeiro, Tarefas, Despensa, Pets ou o fluxo completo de perfis.
- Implementar um sistema completo de mural de avisos ou notificações se ainda não existir o domínio correspondente.
- Inventar prazos de pagamento a partir da data de lançamento de uma despesa.
- Introduzir microsserviços, CQRS, Event Sourcing ou uma camada de padrões genéricos.

## Decisions

### D1 — A Home é uma única rota com contextos explícitos

Manter `web/app/(private)/page.tsx` como entrada `/`, preservando `ProtectedRoute` do layout privado. Criar uma feature `web/features/home/` com componentes focados nos cartões e nos estados de tela. Uma proposta inicial de estrutura é:

```text
web/
├── app/(private)/page.tsx
├── components/layout/AppSidebar.tsx
└── features/home/
    ├── components/
    │   ├── HomePage.tsx
    │   ├── HomeHeader.tsx
    │   ├── ResidenceCreationCard.tsx
    │   ├── HomeContextSwitcher.tsx
    │   ├── OverdueTasksCard.tsx
    │   ├── TodayTasksCard.tsx
    │   ├── UpcomingBillsCard.tsx
    │   ├── WeeklySummaryCard.tsx
    │   ├── ResidenceNoticesCard.tsx
    │   ├── ResidenceMembersCard.tsx
    │   └── PersonalModeCard.tsx
    ├── api/home.api.ts
    ├── hooks/useHomeDashboard.ts
    └── lib/home-metrics.ts
```

A lista é uma orientação, não uma obrigação de criar componentes triviais sem benefício. Reaproveitar componentes `components/ui`, estilos e padrões de chamadas já existentes antes de duplicá-los.

Estados de topo: `loading`, `error`, `no-residence` e `has-residence`. Dentro de `has-residence`, os modos são `residence` e `personal`, com um `selectedResidenceId` válido. Não confundir a seleção visual de Perfil da segunda imagem com um perfil funcional inteiramente novo: o protótipo mostra uma variação da navegação; qualquer rota real de Perfil fora do escopo deve seguir a política de navegação existente, sem criar uma página fictícia.

### D2 — Seleção de residência e origem de verdade

`GET /residences` é a fonte de verdade para residências ativas acessíveis ao usuário, retornando `id`, `name` e `membership`. Se a lista estiver vazia, mostrar a tela de criação. Se houver residências, escolher uma determinística e autorizada na primeira visita (por exemplo, primeira residência da lista já ordenada), preservando a seleção durante a navegação quando possível. Se uma seleção persistida deixar de ser autorizada, descartá-la e escolher uma disponível; jamais reaproveitar dados de outra residência.

O seletor exibe `Residence.name` exatamente como recebido da API. Quando houver várias residências, permitir selecionar uma delas sem misturar seus indicadores.

Persistência local do contexto é uma otimização de UX, não uma fonte de autorização. O backend sempre valida a associação ativa antes de consultar dados da residência.

### D3 — Criação de residência: operação atômica

Adicionar `POST /residences` protegido por `JwtAuthGuard`, com DTO validado, inicialmente `{ name: string }`, respeitando limites de tamanho e espaços em branco. Não aceitar `ownerId`, `creatorId`, `role` ou identificador de usuário vindos do cliente: derivar do JWT.

No backend, adicionar caso de uso de criação em `ResidencesService` (ou serviço equivalente no módulo existente) e um método de persistência específico. Em **uma transação Prisma**, criar `casa`, criar `participacao` ativa do criador como `LIDER` ou papel de gestão compatível com as regras já existentes, e criar `configuracao_casa` se necessária. Campos obrigatórios e defaults do schema real devem ser verificados antes de escrever o método. Retornar uma representação compatível com `Residence` e atualizar a lista da Home após o sucesso.

Falha em qualquer inserção: rollback integral; exibir mensagem acessível e permitir nova tentativa. Bloquear submissões simultâneas na interface, mas não confiar apenas nesse bloqueio para evitar duplicidade.

**Alternativa rejeitada:** criar `casa` e `participacao` em duas chamadas ou dois commits independentes: há risco de residência sem associação ao criador.

### D4 — Contrato de leitura para o dashboard

Priorizar reaproveitar os clientes já presentes (`getResidences`, `getTasks`, `getTaskMembers`, `getExpenses`) enquanto forem suficientes. Para dados ainda não acessíveis ou cuja filtragem não possa ser feita com segurança, adicionar endpoints de leitura específicos e enxutos, preferencialmente `GET /residences/:residenceId/home` (agregado residencial) e/ou `GET /home/personal?residenceId=...` (agregado pessoal). A implementação deve escolher a menor superfície de API que cumpra todos os requisitos, evitando múltiplos endpoints redundantes.

No modo pessoal, o backend deve identificar o usuário pelo JWT e filtrar por associação/atribuição real; **não** considerar seguro trazer dados da casa inteira ao browser e apenas escondê-los por filtros client-side. Na API de tarefas, `assignee.id` representa o usuário e `assigneeId` no filtro pode representar o identificador da participação: não equiparar os dois sem mapear corretamente. Confirmar também a definição de tarefas pessoais (`escopo`) no modelo: o endpoint residencial atual filtra `escopo: "CASA"`, portanto não fornece automaticamente tarefas de escopo pessoal.

Os DTOs de leitura devem expor somente os campos necessários para a Home. Consultas independentes podem ser carregadas em paralelo e exibidas com tratamento de erro por cartão. Todos os agregados precisam de filtros de autorização no servidor.

### D5 — Datas, contagens e pagamentos

**Referência temporal:** calcular o dia atual no fuso de negócio definido para a residência/usuário; até existir configuração de fuso, adotar explicitamente `America/Fortaleza` para esta implementação, sem depender do fuso do servidor. Documentar e testar mudanças de dia em UTC. Semana: segunda-feira 00:00 até a segunda seguinte 00:00 (limite final exclusivo), nesse mesmo fuso.

**Tarefas atrasadas:** tarefas não concluídas/não canceladas com `dueAt` anterior ao início do dia local, sem contar as concluídas. **Tarefas de hoje:** vencimento dentro do dia local; evitar contagem dupla entre os blocos. **Progresso semanal:** tarefas concluídas na semana divididas pela soma das concluídas e das ainda previstas na semana, incluindo atrasos pertinentes conforme regra de negócio a ser confirmada. Se denominador for zero, apresentar 0% e estado vazio. Não misturar tarefas de outra residência ou do outro contexto.

**Contas próximas:** o cliente de despesas atual contém `date` e `paymentStatus`, mas não um campo contratual de **vencimento**. `date` não deve ser interpretado como vencimento sem confirmação do domínio. Primeiro verificar se existe uma fonte persistida de vencimento (ou requisito para modelá-la). Se não existir, mostrar o cartão fiel ao protótipo com estado vazio/indisponível identificado e registrar a limitação; somente criar nova coluna, migração ou endpoint após decisão expressa sobre o modelo de contas a pagar. Pagamentos e totais devem derivar de valores reais, com formatação BRL.

**Avisos:** o cartão `Aviso da casa` não deve mostrar o aviso fictício da imagem. Usar uma fonte de avisos reais apenas se existir contrato consistente e autorização; na ausência, renderizar estado vazio, preservando o espaço visual.

### D6 — Visual e navegação

Reproduzir os quatro protótipos fornecidos como fonte visual: sidebar clara, cabeçalho com saudação, conjunto de cards, alertas de tarefas, alternância Pessoal/residência, bloco de membros apenas no modo da residência, bloco informativo no modo Pessoal e formulário central no estado sem residência. Usar classes Tailwind e componentes do projeto, com tokens reutilizáveis onde isso reduzir repetição. Não codificar nomes ou quantidades mostrados nas imagens.

Habilitar `home` em `AppSidebar` e preservar o acesso existente a `finance`, `pantry` e `pets`. Avaliar habilitar `tasks` porque a rota já existe; links `Ver tarefas` e `Ver detalhes` só devem levar a rotas funcionais, sem inventar páginas. A variação sem residência apresenta navegação reduzida; itens sem implementação não devem ficar clicáveis com aparência de funcionalidade pronta. A saudação deve utilizar identidade autenticada disponível, com fallback neutro, sem nome fixo do protótipo.

Layout responsivo: preservar a composição em colunas no desktop e empilhar cartões em telas pequenas, mantendo navegação por teclado, foco visível, labels e feedback de erro/carregamento.

### D7 — Testes e validação visual

Criar testes unitários para estados da Home, métricas puras e alternância de contexto; testes de integração para `POST /residences` (inclusive rollback, autenticação e vínculo inicial); testes de autorização para leitura pessoal/residencial. Verificar estados vazios, falha parcial, múltiplas residências, troca de residência, datas-limite e ausência de vazamento de dados. Executar lint, testes e build pelos scripts reais de `web` e `backend`.

Validar screenshots de desktop contra **cada** protótipo fornecido, usando conteúdo de teste controlado (não dados fixos em produção), e realizar pelo menos uma verificação em viewport móvel. O OpenSpec valida a especificação, não a aderência visual.

## Data Flow

```text
GET / (rota privada)
  -> obter usuário autenticado e GET /residences
     -> [] => ResidenceCreationCard
         -> POST /residences (JWT)
         -> transação: casa + participação + configuração
         -> atualizar residências e abrir Home residencial
     -> [residências] => selecionar residenceId autorizado
         -> contexto residence => consultas autorizadas da casa
         -> contexto personal  => consultas do usuário autenticado
         -> transformar dados em métricas e renderizar cards
```

## Risks / Trade-offs

- **Sem endpoint de criação:** exige implementação backend e transação.
- **Ausência de data explícita de vencimento:** impede preencher corretamente `Contas próximas` com o contrato atual sem ajuste de domínio.
- **Tarefas pessoais:** filtragem residencial por `escopo: CASA` não resolve automaticamente o caso pessoal; checar schema e adicionar consulta apropriada.
- **Avisos:** não inferir que a tabela de notificações equivale a mural de avisos da residência.
- **Fidelidade visual versus dados reais:** manter o desenho, mas exibir estados vazios em vez de mockar tarefas, moradores e pagamentos.
- **Concorrência na criação:** uma transação garante consistência; deduplicação exige regra adicional se a operação puder ser repetida após uma resposta perdida.

## Migration Plan

1. Implementar endpoint e serviço de criação de residência com testes.
2. Criar feature Home e remover redirecionamento da rota privada.
3. Integrar seleção de residência e modo Pessoal com consultas autorizadas.
4. Implementar cards, métricas e estados vazios, priorizando contratos existentes.
5. Integrar sidebar, links e responsividade; comparar com as quatro telas.
6. Executar testes e verificar cenários das três specs antes de arquivar a mudança.

Rollback: reverter a rota Home e a habilitação do menu sem eliminar dados residenciais criados; migrações eventualmente adicionadas devem ter plano próprio de reversão.

## Open Questions

1. **Vencimento de contas:** existe no banco uma entidade que corresponda ao prazo real de pagamento, ou o projeto deverá passar a armazenar essa informação?
2. **Métricas da semana:** o progresso conta tarefas programadas, concluídas e atrasadas segundo qual regra final? A fórmula acima é a proposta inicial.
3. **Fuso horário:** `America/Fortaleza` é provisório; o produto deve adotar fuso configurável da residência?
4. **Avisos:** qual recurso efetivamente representa os avisos da casa, caso esse módulo venha a existir?
5. **Identidade/Perfil:** a versão visual com Perfil selecionado exige navegação funcional para uma página de perfil nesta entrega, ou apenas correspondência visual da Home sem residência?

Estas questões não devem ser preenchidas com dados inventados pelo Codex. As decisões de implementação devem privilegiar os comportamentos já verificáveis e estados vazios quando faltarem fontes reais.

## Visual References

The visual references for this change are located in
`openspec/changes/implement-home-dashboard/references/`.

- `home-no-residence.png`: Home without an associated residence.
- `home-no-residence-profile.png`: Navigation state with Profile selected.
- `home-residence.png`: Residence dashboard.
- `home-personal.png`: Personal dashboard.

These images are the primary visual references for implementation.

The residence name displayed in the prototypes is illustrative
and MUST be replaced with the actual residence name.

The implementation MUST preserve the existing FullHouse design
system while reproducing the layouts as faithfully as possible.
