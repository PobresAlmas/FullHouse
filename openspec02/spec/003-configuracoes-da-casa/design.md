# SPEC-003 — Design

**Estado:** desenho e decisões da change de origem, com tarefas concluídas e pendências preservadas em [tasks.md](tasks.md).

## Dependências

- Next.js, TypeScript e Tailwind com `AppSidebar`, `AppPageHeader`, layout privado e perfil em `/profile`.
- [Configurações](../../../web/app/%28private%29/settings/page.tsx), [componentes e cliente de Settings](../../../web/features/settings/), serviço de acesso à residência e APIs de despensa e notificações.
- [Guia de revisão visual](../../../docs/design-references/REVISAO-ANTES-DE-CODAR.md) e [nove capturas do protótipo](../../../docs/design-references/design-references/settings/README.md).
- A base analisada na proposta tinha o item de navegação desabilitado, política global e CRUD de categorias. A evolução do contrato de membros e da paginação de notificações partiu dessas operações existentes.

## Fluxo principal

1. Autenticar a sessão e obter a residência ativa e o papel com `GET /residences`. Usar a única residência vinculada, sem seletor em Configurações.
2. Abrir Casa por padrão. Sincronizar a seção e as abas de Preferências com a query da URL.
3. Carregar os dados e as permissões da seção aberta. Enviar alterações somente por ação explícita do usuário.
4. Após salvar, mostrar confirmação e atualizar os dados. Uma alteração de nome deve atualizar a barra lateral via `RESIDENCE_MEMBERSHIP_CHANGED_EVENT`.

## Fluxos alternativos

- Minha conta direciona a `/profile`. Parâmetros inválidos retornam à navegação válida.
- Sem casa, exibir estado vazio nas seções da residência. A central de notificações usa a sessão da conta. Ao mudar de vínculo ou encerrar a sessão, invalidar os dados anteriores.
- Falha mostra feedback e opção de repetir a consulta quando possível. Erro de validação impede gravação. A API trata acesso insuficiente, recursos de outra casa e conflitos sem divulgar registros alheios.
- Uma categoria em uso exige reclassificar seus itens. A exclusão pede confirmação.

## Interface gráfica

- Desktop de referência 1512×982 com barra global, cabeçalho, menu interno vertical com seleção lavanda e conteúdo fluido. A largura aproximada do menu interno nas capturas é 350 px.
- Usar fundo lilás acinzentado claro, cartões claros com borda fina e raio de 10–12 px, tipografia discreta e verde para ações. Validar as aproximações nas imagens e reaproveitar os estilos do FullHouse.
- Preferências tem abas horizontais com seleção verde e cartões em duas colunas quando houver espaço. Em celular, usar menu rolável ou seletor acessível. Conferir também a janela de cerca de 390×844.
- Informar carregamento, vazio, erro e sucesso. Usar rótulos, foco visível, seleção acessível, aviso de estado e suporte de teclado. Validar contraste em cada tema que for disponibilizado.

## Componentes sugeridos

`SettingsPage` orquestra o contexto e a URL. O desenho separa subnavegação, Casa, Moradores, Permissões, Notificações e Preferências em seções, com seletores de tema e campos reutilizáveis. Os clientes HTTP reutilizam as operações do domínio. A rota usa os parâmetros `section` e `tab`, como em `/settings?section=preferences&tab=pantry`. O parâmetro `tab` se aplica apenas a Preferências.

- Valores previstos para `section`: `house`, `members`, `permissions`, `notifications` e `preferences`.
- Valores previstos para `tab`: `general`, `categories`, `pantry`, `finance` e `pets`.

## Integração e persistência

| Área           | Contrato previsto                                                                                                                                                                                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Casa           | `GET /residences` retorna papel e política. `PATCH /residences/:id` recebe `{ "name": "Nome da casa" }`, com trim, de 1 a 80 caracteres e autorização de gestor.                                                                                                                   |
| Moradores      | Reaproveitar a consulta de membros. Quando necessário, usar o DTO de `GET /residences/:id/settings/members` com ID, usuário, nome, contato autorizado, papel e estado. O contrato preserva a privacidade dos membros.                                                              |
| Permissões     | `GET/PATCH /residences/:id/settings/permissions` lê e altera a política global. `PATCH /residences/:id/settings/members/:memberId/access` atualiza `canEditContent` e a interface apresenta a permissão efetiva e a herança. As guardas de escrita consideram o acesso individual. |
| Categorias     | Reutilizar `GET/POST/PATCH/DELETE /residences/:id/pantry/categories` e a restrição de categoria em uso.                                                                                                                                                                            |
| Notificações   | `GET /notifications?limit=20&cursor=...` retorna `items`, `unreadCount` e `nextCursor`, com limite de 1 a 50 e ordem `criado_em DESC, id DESC`. `PATCH /notifications/:id/read` opera sobre avisos da conta autenticada.                                                           |
| Perfil pessoal | Manter `PATCH /users/me` e `POST /users/me/avatar` no fluxo de perfil existente.                                                                                                                                                                                                   |

Preferências usam `GET/PATCH /residences/:id/settings/preferences`. O registro é único por usuário e residência, com usuário derivado da sessão. O PATCH é parcial e atômico, rejeita chaves desconhecidas e preserva os campos omitidos. Defaults previstos no desenho original:

```json
{
  "notifications": {
    "newTasks": true,
    "newExpenses": true,
    "upcomingDueDates": true,
    "residentInvitations": true,
    "houseUpdates": false
  },
  "pantry": { "expirationNoticeDays": 5, "showExpired": true },
  "finance": { "dueNoticeDays": 5, "showOverdue": true },
  "pets": {
    "vaccineReminders": true,
    "dewormingReminders": true,
    "appointmentReminders": true
  }
}
```

O plano original previa consulta de notificações a cada 30 segundos enquanto a seção estivesse aberta e visível. A geração de avisos depende de integrações dos módulos que produzem os eventos. Unicidade de vínculo ativo, preferências e permissões exigem mudanças aditivas com preservação dos dados existentes.

## Estados da interface

Carregando, vazio, erro e sucesso por seção. Escritas aguardam resposta e mostram o resultado. Preferências de alertas sem integração informam indisponibilidade. Os estados de Claro, Escuro e Sistema dependem da adaptação visual das rotas compartilhadas.

## Decisões de implementação

- Manter papéis de gestão, política global e permissão de edição individual como decisões distintas. Um override nulo herda a política global.
- Em Permissões, mostrar a política global de `GET /residences` e permitir que gestores alterem seu valor pelo `PATCH /residences/:id/settings/permissions`. O seletor individual inclui a opção de herança e envia `canEditContent: null` para restaurá-la. Ao salvar uma mudança da política, atualizar a residência e as permissões efetivas da lista.
- Em G05, a API usa `requireMembership` nas leituras e `requireCreateEditPermission` nas mutações da lista compartilhada, categorias e criação ou edição de pets e cuidados. `requireManager` continua protegendo o mural e as exclusões em Pets. A proteção de categoria em uso e o controle de versão da lista permanecem no serviço.
- As telas da lista, categorias em Despensa e Configurações, e Pets calculam a permissão de edição com papel, política global e override da resposta de `GET /residences`. O mural continua exibindo as ações de escrita apenas para gestores.
- O tema previsto usa um `ThemeProvider` compartilhado, chave `fullhouse:theme` no dispositivo e `prefers-color-scheme` para Sistema. Aplicar cedo para evitar mudança visível no carregamento e adaptar cores fixas antes de declarar o tema completo.
- Sequenciar navegação, vínculo ativo único, contratos existentes e categorias antes da evolução dos endpoints, preferências, permissões individuais e temas. Verificar com testes de UI, DTO, serviço, autorização HTTP, duas contas e as nove imagens de referência.

## G07 — Sino e central

- Sino e central compartilham o cartão e os destinos já autorizados pelos módulos. O link ocupa o cartão, e os botões de ação ficam em elementos irmãos, com foco e ativação próprios. Identificar **Lida** e **Não lida** no texto e usar a paleta de ambos os temas.
- A central usa a identidade da sessão mesmo antes do ingresso em uma casa. No sino, clique fora dispensa o painel e Escape o fecha devolvendo o foco ao botão. Erros de carregamento e de ação ficam no painel ou na central até nova tentativa.
- `PATCH /notifications/read-all` retorna `{ updatedCount }` após atualizar somente registros não lidos cujo destinatário é a sessão. A operação de leitura atualiza apenas `notificacao.lida`.
- Depois de uma mutação, a central e o sino recarregam os dados da conta. O fluxo SSE sinaliza mudanças e a atualização periódica funciona como alternativa. A central preserva as páginas já carregadas no filtro atual. O total sempre se refere à conta, inclusive com filtro.
- Manter o link do interesse da [SPEC-001](../001-anunciar-quarto/requirements.md#critérios-de-aceitação) e a conversa e as decisões da [SPEC-004](../004-negociacao-e-convites/requirements.md#critérios-de-aceitação).

## Rastreabilidade

| Requisitos             | Design                                           | Critérios       |
| ---------------------- | ------------------------------------------------ | --------------- |
| RF01–RF02, RNF01–RNF02 | Rota privada, perfil, query e comparação visual  | CA01–CA02, CA12 |
| RF03–RF06, RNF03       | Casa, membros, política, override e guardas      | CA03–CA06       |
| RF07–RF09              | Categorias existentes, preferências e eventos    | CA07–CA09       |
| RF10, RNF03            | Centro autenticado, filtro, paginação e marcação | CA10            |
| RF11, RNF02            | Tema do dispositivo e verificação de contraste   | CA11–CA12       |
| RF13–RF14, RNF03       | Cartões, fechamento e leitura por conta          | CA14–CA15       |
