# Sprint 03 — Implementação de Configurações da casa

**Responsável:** Emilson<br>
**Módulo principal:** Configurações da casa<br>
**OpenSpec:** [Design da SPEC-003](../../../../openspec02/spec/003-configuracoes-da-casa/design.md)

## 1. Visão geral

A rota privada de Configurações organiza os dados da residência e as escolhas da conta. A navegação usa a residência ativa da sessão. O servidor valida o vínculo, o papel de gestão e a titularidade dos dados a cada operação.

## 2. Frontend

| Componente                                                                                                                                                                          | Responsabilidade                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [Rota Configurações](../../../../web/app/%28private%29/settings/page.tsx) e [SettingsPage](../../../../web/features/settings/components/SettingsPage.tsx)                           | Normalizam a navegação, carregam os dados da seção, salvam o nome da casa e integram a lista de moradores, as categorias e a central. |
| [SettingsMembersTable](../../../../web/features/settings/components/SettingsMembersTable.tsx)                                                                                       | Exibe papéis e acesso dos moradores. A gestão pode alterar o acesso de moradores elegíveis e acionar a remoção.                       |
| [PreferencesPanel](../../../../web/features/settings/components/PreferencesPanel.tsx) e [ThemeProvider](../../../../web/providers/ThemeProvider.tsx)                                | Apresentam os formulários de preferência e alternam Claro, Escuro ou Sistema. A escolha de tema é armazenada no navegador.            |
| [API de notificações](../../../../web/features/notifications/api/notifications.api.ts) e [NotificationBell](../../../../web/features/notifications/components/NotificationBell.tsx) | Consultam avisos e sua contagem, marcam leitura individual e recebem atualizações por SSE. A central usa paginação e filtro da API.   |

A aba **Categorias** usa a API de Despensa. A opção de ocultar vencidos é lida na [Despensa](../../../../web/app/%28private%29/pantry/page.tsx), e a de ocultar atrasados é lida no [Financeiro](../../../../web/app/%28private%29/finance/page.tsx). Os controles de Permissões exibem o acesso efetivo. A política global e a restauração da herança usam a API de Residências.

## 3. Backend

| Operação                                            | Contrato                                                                                                                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consultar a casa e editar seu nome                  | `GET /residences` e `PATCH /residences/:residenceId`.                                                                                                                      |
| Consultar moradores, alterar acesso e remover       | `GET /residences/:residenceId/settings/members`, `PATCH /residences/:residenceId/settings/members/:memberId/access` e `DELETE /residences/:residenceId/members/:memberId`. |
| Consultar e alterar política global ou preferências | `GET/PATCH /residences/:residenceId/settings/permissions` e `GET/PATCH /residences/:residenceId/settings/preferences`.                                                     |
| Consultar e marcar avisos                           | `GET /notifications`, `GET /notifications/stream` e `PATCH /notifications/:id/read`. A lista ordena por data e ID e retorna contagem e cursor.                             |

Os contratos são implementados em [Residências](../../../../backend/src/residences/), [Notificações](../../../../backend/src/notifications/) e [Despensa](../../../../backend/src/pantry/). A atualização do nome, a política global e as alterações de acesso passam pelo [serviço de acesso à residência](../../../../backend/src/residences/residence-access.service.ts).

## 4. Regras de persistência e validação

- [Preferências](../../../../backend/prisma/migrations/20261121120000_residence_preferences/migration.sql) são armazenadas por conta e casa. O PATCH preserva campos omitidos e rejeita valores inválidos.
- O [acesso individual](../../../../backend/prisma/migrations/20261122120000_individual_residence_access/migration.sql) permite edição explícita, somente leitura e herança pelo valor nulo. O papel de gestão é verificado separadamente.
- A [restrição de vínculo ativo](../../../../backend/prisma/migrations/20261120120000_unique_active_residence_membership/migration.sql) protege a unicidade da residência ativa por conta.
- A geração de alertas conforme cada preferência e a revisão visual completa permanecem registradas no checklist.

## 5. Rastreabilidade

- [Requisitos implementados](requisitos.md) e [comandos para as evidências](testes.md).
- [Tarefas da SPEC-003](../../../../openspec02/spec/003-configuracoes-da-casa/tasks.md) e [referências visuais de Configurações](../../../design-references/design-references/settings/README.md).
- [Implementação de negociação e convites](negociacao-e-convites/implementacao.md) e [implementação da paginação](paginacao-da-negociacao/implementacao.md).
