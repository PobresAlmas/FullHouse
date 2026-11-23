# Design técnico — Configurações do FullHouse

## 1. Baseline verificável

Frontend atual é Next.js 16 com TypeScript e Tailwind; `AppSidebar`, `AppPageHeader` e `/profile` existem. `settings` ainda está desabilitado no sidebar e a rota não existe. `GET /residences` retorna as residências ativas do usuário, seu papel (`LIDER|ADMINISTRADOR|MORADOR`) e `creationEditPolicy` (`TODOS|LIDERES`). A decisão de produto é uma participação ativa por usuário; não há seletor de residência em Settings. `/residences/:residenceId/members` retorna `id`, nome/apelido público e papel, sem e-mail. Categorias já têm CRUD com autorização no backend. `GET /notifications` atualmente retorna no máximo quatro itens e `unreadCount`; `PATCH /notifications/:id/read` é restrito ao dono.

## 2. Arquitetura de interface e roteamento

- Nova rota privada `app/(private)/settings/page.tsx` usa o `ProtectedRoute` do layout já existente.
- `features/settings/components/SettingsPage.tsx` contém somente orquestração; componentes separados: `SettingsSubnav`, `HouseSection`, `MembersSection`, `PermissionsSection`, `NotificationsSection`, `PreferencesSection`, `ThemeSelector`, `SettingField`.
- `features/settings/api/settings.api.ts` **reaproveita** `getResidences`, `getResidencePermissionSettings`, `updateResidencePermissionSettings`, `getPantryCategories`, CRUD existente, `getNotifications` e `markNotificationRead`. Novos endpoints devem ficar em serviço por domínio ou API específica, sem HTTP ad hoc nos componentes.
- O backend e o banco impedem mais de uma participação ativa por usuário. Settings usa a única residência de `GET /residences`; sem residência, exibe estado vazio e não chama endpoints com `residenceId` indefinido.
- Subnavegação local idêntica ao protótipo, porém item `Minha conta` leva a `/profile`; manter `Configurações` como item principal habilitado no AppSidebar. Em mobile, subnavegação vira menu rolável ou select acessível.
- URL sugerida: `/settings?section=house|members|permissions|notifications|preferences&tab=general|categories|pantry|finance|pets` (query `tab` apenas em `preferences`). Links de aba são navegáveis, preservam reload e histórico; normalizar parâmetros inválidos.
- Nunca renderizar dados de exemplo do Figma no ambiente real.
- Notificações em Settings usam paginação e consultam a API autenticada periodicamente (30 s enquanto a seção está aberta e aba visível); sem conexão externa, WebSocket ou SSE. O sino existente permanece compatível.

## 3. Identidade visual extraída das imagens

Não há tokens do Figma estruturados; medidas exatas além da resolução das imagens são inferências e devem ser validadas visualmente.

- Referência desktop 1512×982. Painel lateral global já existe; painel interno largo (~350 px visualmente na captura) com fundo claro, borda fina e seleção lavanda; conteúdo de largura fluida.
- Fundo lilás acinzentado muito claro; cartões com fundo levemente rosado/branco, bordas finas, raio ~10–12 px; sem sombra pronunciada.
- Verde escuro (#4e812f aproximado do sistema existente) para ações; azul/lavanda na seleção interna; erros em vermelho apenas para falha.
- Tipografia discreta e títulos sem exagero. Reaproveitar classes e `Button` do repositório; não importar um novo design system.
- Preferências: abas horizontais `Geral | Categorias | Despensa | Financeiro | Pets` com realce em verde, cartões compactos em duas colunas quando cabem.
- A identidade visual atual do app em `AppSidebar` (`#f8f4fa`, `#d9d0dc`, `#4e812f`) tem precedência em detalhes não visíveis nas capturas.
- Capturar comparação com cada PNG após implementação, registrar diferenças justificadas. A captura é referência visual, não fonte para copiar nomes ou e-mails de moradores.

## 4. Contratos existentes — usar antes de criar código novo

| Ação                             | API                                                                        | Observação                                                                  |
| -------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Listar residências e papel atual | `GET /residences`                                                          | inclui `membership.role`, `creationEditPolicy`                              |
| Ler política                     | `GET /residences/:id/settings/permissions`                                 | retorna `residenceId`, `creationEditPolicy`, `canManage`                    |
| Alterar política global          | `PATCH /residences/:id/settings/permissions` `{creationEditPolicy: "TODOS" | "LIDERES"}`                                                                 | somente líder/admin autorizado no backend |
| Listar membros                   | `GET /residences/:id/members`                                              | verificar formato/resposta; endpoint vive em PetsController                 |
| Categorias                       | `GET/POST/PATCH/DELETE /residences/:id/pantry/categories`                  | CRUD existente e restrição de categoria em uso                              |
| Notificações pessoais            | `GET /notifications?limit=20&cursor=...`, `PATCH /notifications/:id/read`  | GET será paginado; cursor opaco por ID, leitura sempre filtrada por usuário |
| Perfil pessoal                   | `PATCH /users/me`, `POST /users/me/avatar`                                 | já usados por `/profile`, não duplicar                                      |

## 5. Contratos propostos (não presentes no backend analisado)

Os novos DTOs são propostas. Auditar `schema.prisma` antes de escolher modelagem final e manter JSON/nomes consistentes com o padrão existente.

### 5.1 Dados da residência e membros

- `PATCH /residences/:id` com `{ "name": "Casa Grifinória" }` (1–80 caracteres após trim): somente líder/admin, nome vazio = 400, não membro = 404 como no `ResidenceAccessService`, sucesso retorna residência atualizada; dados refletidos no AppSidebar após salvar, emitindo `RESIDENCE_MEMBERSHIP_CHANGED_EVENT`.
- Listagem de membros: preferir endpoint existente; se o payload não incluir papel/identidade necessários, **ampliar com DTO específico** `GET /residences/:id/settings/members`, contendo `{id, userId, name, email, role, status}`. Nunca retornar hashes/tokens.

### 5.2 Níveis de permissão individuais (diferença Figma × backend)

O protótipo mostra `Administrador`, `Pode editar`, `Somente leitura` por pessoa. O backend atual mantém papéis `LIDER/ADMINISTRADOR/MORADOR` e **uma política global** `TODOS/LIDERES`; esses conceitos NÃO são equivalentes.

Decisão proposta: conservar o papel estrutural (`role`) e a política global existentes; introduzir **um override individual de edição** para moradores (`canEditContent: boolean | null`, null = herdar política global). Na UI de permissões:

- `Administrador` apenas quando `role` é `LIDER` ou `ADMINISTRADOR` (não permitir atribuir essa função pelo seletor sem operação de transferência de papel aprovada separadamente).
- `Pode editar` para morador com permissão efetiva de edição.
- `Somente leitura` para morador com permissão efetiva de leitura.
- Apresentar o papel estrutural e texto claro quando a permissão foi herdada da política global.

Contrato novo sugerido `PATCH /residences/:id/settings/members/:memberId/access` com `{ "canEditContent": true|false|null }`; somente líder/admin, membro de outra residência = 404. O backend deve aplicar `canEditContent` nas guardas existentes **em todos** os pontos relevantes de criar/editar, sob pena de controle visual enganoso. **Não habilitar seletores individuais antes de completar essa aplicação.** Não alterar papéis gerenciais, evitar autodespromoção e manter pelo menos um gestor; ações de papel administrativo ficam fora deste escopo.

### 5.3 Preferências persistidas

Proposta: `GET /residences/:id/settings/preferences` e `PATCH /residences/:id/settings/preferences`, com `scope: "USER"` implícito no token (um registro por usuário + residência). **Não** aceitar `userId` arbitrário no corpo. Estrutura de resposta proposta:

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

`PATCH` é **parcial** e atômico por objeto: `{ "pantry": { "expirationNoticeDays": 7 } }`. Campos ausentes são preservados, campos não reconhecidos rejeitados (400); valores de aviso válidos `1,3,5,7,14`. No banco, default idem JSON; usar migration reversível e chaves únicas de escopo. Após salvar, GET deverá refletir o valor, mesmo após logout/login. Preferências de tema ficam no dispositivo; ver abaixo.

**Atenção:** o serviço atual de notificações não entrega automaticamente alertas de tarefas/pantry/financeiro/pets. O backend que gera alertas precisa ler as preferências antes de publicar; até integrar essa dependência, controles de lembrete devem exibir indisponibilidade ou ficar fora da release funcional, sem afirmar que os avisos chegarão.

### 5.4 Notificações — paginação

Aprimorar `GET /notifications?limit=20&cursor=...` retornando `{items, unreadCount, nextCursor}`; manter compatibilidade com o sino (`items`, `unreadCount`), limites `1..50`. A ordenação deve ser determinística `criado_em DESC, id DESC`; filtrar pelo usuário autenticado; `PATCH /notifications/:id/read` continua existente. Não afirmar SSE/WebSocket em notificações até existir um canal dedicado.

## 6. Temas

O Figma apresenta `Claro`, `Escuro`, `Sistema`. Implementar `ThemeProvider` único no layout principal; `localStorage('fullhouse:theme')` no dispositivo, fallback `system`; aplicar o tema antes do primeiro paint quando viável e evitar hydration mismatch. `Sistema` acompanha `prefers-color-scheme` e mudanças do SO. **Bloqueio técnico conhecido:** código atual tem muitas cores hardcoded; mapear e converter para tokens de tema em páginas compartilhadas antes de declarar Escuro pronto. Se o time adiar o tema escuro, os dois controles NÃO deverão parecer funcionais.

## 7. Fluxos, estados e segurança

- `loading`, `empty`, `error`, `success` por seção com retry quando possível; sem console errors como feedback ao usuário.
- Salvar mudanças só após ação explícita e com loading; resposta 403 mostra acesso insuficiente, 404 não vaza dados de outra residência, 409 conflito de negócio.
- Não usar mock visual em produção; sem `alert()` e sem botão morto; confirmação antes de exclusão de categoria.
- Após troca de residência ou logout, invalidar caches e impedir o display de dados da casa anterior.
- Uma chamada PATCH autorizada é validada no **servidor**, mesmo quando a UI desabilita controles.
- Acessibilidade: formulário com label, foco visível, `aria-current`, `role="status"`, teclado em tabs/menus, contraste para temas, layout mobile sem overflow horizontal.

## 8. Estratégia de testes

Unit UI de abas, renderização, estados, atualização de tema, confirmação de exclusão; unit API mocks; backend DTO/repositório/serviço; teste HTTP 200/400/403/404 para autorização; isolamento entre residências, persistência após refresh e regressão nas regras de edição (morador leitura não altera API via curl). E2E: login → abrir settings → editar política → testar com segunda conta → categorias → recarregar; notificações paginadas; tema em outras rotas. Fazer comparação visual das nove telas.

## 9. Sequência sem regressões

1. Baseline, unicidade de residência ativa, notificações paginadas e design visual do shell/settings.
2. Casa/Moradores/Permissões **globais** com APIs existentes.
3. Categorias com API existente.
4. Evoluir endpoints de residência/paginação.
5. Persistir preferências e integrar motores de notificação onde aplicável.
6. Permissões individuais (com guardas reais) e temas completos.
7. Build, testes, screenshots, revisão e só então habilitar seções finais.
