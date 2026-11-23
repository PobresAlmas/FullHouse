# SPEC-003 — Tarefas

Use este checklist como pedido de implementação. Consulte [requirements.md](requirements.md) e [design.md](design.md) antes de começar. Os estados foram preservados da change de origem.

## Reconhecimento

- [x] **T01 — Inspecionar a base.** Executar `git status` e conferir configurações, `package.json`, `schema.prisma`, migrações, testes e specs existentes. Identificar convenções e conflitos. **Refs:** RNF03, CA01.
- [x] **T02 — Mapear componentes e contratos.** Mapear estrutura, contratos e estado de `AppSidebar`, `AppPageHeader`, `/profile`, `ResidenceAccessService`, APIs de categorias e notificações. **Refs:** RF01–RF10, CA01.
- [x] **T03 — Conferir as decisões de design.** Validar e ajustar as decisões do [guia de revisão](../../../docs/design-references/REVISAO-ANTES-DE-CODAR.md). Usar os testes existentes como referência inicial. **Refs:** RNF01–RNF03, CA12.
- [ ] **T04 — Comparar as nove referências.** Montar comparação visual com os nove PNGs: desktop 1512×982 e mobile ~390×844. **Refs:** RNF01–RNF02, CA12.
- [x] **T05 — Proteger o vínculo residencial único.** Garantir no backend e no PostgreSQL que cada usuário tenha no máximo uma participação ativa global. Participações históricas encerradas continuam permitidas. **Refs:** RF01, RNF03, CA01.

## Navegação e estrutura — fase 1

- [x] **T06 — Criar rota e página.** Criar `app/(private)/settings/page.tsx` e `features/settings/components/SettingsPage.tsx`. **Refs:** RF01, CA01.
- [x] **T07 — Integrar a navegação e o perfil.** Criar subnavegação `Minha conta | Casa | Moradores | Permissões | Notificações | Preferências` e manter link para `/profile`. **Refs:** RF01, CA02.
- [x] **T08 — Persistir seção e aba na URL.** Implementar query params `section`/`tab`, estados inválidos, teclado, mobile, aria. **Refs:** RF02, RNF02, CA02, CA12.
- [x] **T09 — Reusar cabeçalho e barra lateral.** Reusar `AppSidebar`/`AppPageHeader`, obedecer referências de fundo, bordas, lavanda/verde e cartões. **Refs:** RNF01, CA12.
- [x] **T10 — Habilitar os acessos à página.** Habilitar `settings` em `implementedSections` **somente quando ao menos a fase 1 estiver funcional**. Tornar o atalho do cabeçalho navegável quando autorizado. **Refs:** RF01, CA01.
- [x] **T11 — Testar acesso e navegação.** Testar navegação, reload em aba específica, sem residência, sem auth e layout responsivo. **Refs:** RF01–RF02, RNF02–RNF03, CA01–CA02, CA12.
- [x] **T12 — Listar notificações reais.** Exibir notificações reais na seção Notificações, com filtro geral/não lidas, paginação e atualização periódica autenticada. Manter o sino compatível. Atualização periódica não cria promessa de eventos que o backend ainda não gera. **Refs:** RF10, CA10.

## Casa e Moradores — fases 1 e 2

- [x] **T13 — Carregar residência e estados da consulta.** Integrar `getResidences()`, usar a residência ativa e implementar loading/erro/empty. **Refs:** RF01, RF03, CA01.
- [x] **T14 — Integrar a lista de moradores.** Integrar GET de membros já existente. Auditar tipo real e manter privacidade, estado vazio. **Refs:** RF04, RNF03, CA04.
- [x] **T15 — Exibir dados da casa e membros.** Exibir Casa/Moradores com cartões, datas e papéis, sem dados hardcoded. **Refs:** RF03–RF04, CA03–CA04.
- [x] **T16 — Persistir o nome da residência.** Implementar PATCH para nome da casa se ausente: DTO, controller, access service, repository, testes de autorização, sincronização da sidebar. **Refs:** RF03, RNF03, CA03.
- [x] **T17 — Testar edição e escopo da casa.** Cobrir edição permitida, nome inválido, usuário sem residência e cross-residence. **Refs:** RF03–RF04, RNF03, CA03–CA04.

## Política global — fase 1

- [x] **T18 — Reusar o contrato de política global.** Reutilizar `getResidencePermissionSettings` e `updateResidencePermissionSettings` (`TODOS|LIDERES`). **Refs:** RF05, CA05.
- [x] **T19 — Apresentar a política global.** Exibir política global fiel ao estilo do protótipo **sem** fingir ser a permissão individual visual. **Refs:** RF05–RF06, CA05–CA06.
- [x] **T20 — Restringir edição de política.** Bloquear edição para não gestores no frontend. Verificar 403 no backend. **Refs:** RF05, RNF03, CA05.
- [x] **T21 — Conferir persistência e guardas.** Persistir alteração, recarregar e verificar que guardas de criação/edição existentes obedecem a política. **Refs:** RF05, RNF03, CA05.

## Categorias — fase 1

- [x] **T22 — Reusar a API de categorias.** Reusar API de pantry/categories e componente/modal existente quando compatível. **Refs:** RF07, CA07.
- [x] **T23 — Gerenciar o ciclo de categorias.** Implementar lista, criar, editar, confirmar exclusão, erros de duplicidade/categoria com itens. **Refs:** RF07, CA07.
- [x] **T24 — Recarregar categorias e testar papéis.** Atualizar dados da despensa após modificação. Testar com gerente e não gerente. **Refs:** RF07, RNF03, CA07.

## Preferências persistidas — fase 2

- [x] **T25 — Modelar preferências individuais.** Ler schema Prisma real e modelar preferências por `userId + residenceId`, com defaults, unicidade e migration segura. **Refs:** RF08, CA08.
- [x] **T26 — Validar os contratos de preferências.** Criar DTOs para `GET/PATCH .../settings/preferences`, validação de objetos aninhados, partial PATCH e controle de acesso. **Refs:** RF08, RNF03, CA08.
- [x] **T27 — Persistir preferências de avisos.** Implementar `Geral`: preferências de notificação persistidas com controles liga/desliga. Geração dos eventos permanece separada. **Refs:** RF08–RF09, CA08–CA09.
- [x] **T28 — Aplicar preferências da despensa.** Implementar `Despensa`: prazo, mostrar vencidos. Aplicar filtro realmente na visualização. **Refs:** RF08–RF09, CA08–CA09.
- [x] **T29 — Aplicar preferências financeiras.** Implementar `Financeiro`: prazo, mostrar atrasadas. Aplicar filtro realmente na visualização. **Refs:** RF08–RF09, CA08–CA09.
- [x] **T30 — Configurar preferências de Pets.** Implementar `Pets`: vacinas, vermífugo, consultas. Conectar a eventos reais antes de prometer avisos. **Refs:** RF08–RF09, CA08–CA09.
- [ ] **T31 — Testar persistência e isolamento.** Cobrir salvamento, refresh, logout/login, dados inválidos e isolamento entre moradores. **Refs:** RF08–RF09, RNF03, CA08–CA09.

## Notificações — fase 2

- [x] **T32 — Adicionar paginação de notificações.** Adaptar GET existente com paginação determinística sem quebrar `NotificationBell`. **Refs:** RF10, CA10.
- [x] **T33 — Construir o centro de avisos.** Implementar centro de notificações com lidas/não lidas, carregar mais, loading/erro, uso de `markNotificationRead`. **Refs:** RF10, CA10.
- [ ] **T34 — Integrar geração de alertas.** Identificar e implementar dependências de geração de alertas antes de habilitar promessas de notificação. Registrar mudanças extras em change separada se sair do escopo. **Refs:** RF09, CA09.
- [x] **T35 — Testar a central e as preferências.** Testar paginação, contagem, privacidade e controle de preferência. **Refs:** RF09–RF10, RNF03, CA09–CA10.

## Permissões individuais — fase 2

- [x] **T36 — Validar o modelo de acesso individual.** Validar modelagem do override de edição e sua relação com `LIDER/ADMINISTRADOR/MORADOR` e `TODOS/LIDERES`. **Refs:** RF05–RF06, CA05–CA06.
- [x] **T37 — Persistir permissão por membro.** Criar migration, endpoint de atualização por membro e resposta de permissão efetiva. **Refs:** RF06, CA06.
- [x] **T38 — Aplicar as guardas de edição.** Adaptar guardas de conteúdo para considerar override. Separar exclusão e ações pessoais das operações de gestão. **Refs:** RF06, RNF03, CA06.
- [x] **T39 — Expor permissão e remoção na interface.** Expor seleção de `Pode editar`/`Somente leitura` por morador e remoção protegida no menu de ações. **Refs:** RF06, CA06.
- [ ] **T40 — Testar autorização e herança.** Testar endpoint direto de morador sem permissão, cruzamento de residência, gestor, herança de política e rollback. **Refs:** RF06, RNF03, CA06.

## Tema e estética — fase 2

- [ ] **T41 — Mapear cores e tokens.** Extrair tokens de cores para claro/escuro e auditar cores hardcoded em componentes existentes. **Refs:** RF11, RNF01, CA11–CA12.
- [ ] **T42 — Aplicar Claro, Escuro e Sistema.** Implementar seletor Claro/Escuro/Sistema, `localStorage` e `prefers-color-scheme` sem hydration warnings. **Refs:** RF11, RNF02, CA11.
- [ ] **T43 — Conferir tema nas rotas.** Validar tema em Home, Tarefas, Financeiro, Perfil, Settings, modais e estados de erro. **Refs:** RF11, RNF02, CA11–CA12.
- [ ] **T44 — Comparar o resultado com as referências.** Comparar screenshots originais, não alterar o design de outras páginas sem necessidade. **Refs:** RNF01, CA12.

## Qualidade e entrega

- [ ] **T45 — Cobrir contratos e componentes.** Unit/UI dos componentes e serviço API. Backend unit e HTTP de 200/400/403/404/409. **Refs:** RNF01–RNF03, CA01–CA12.
- [ ] **T46 — Executar testes, build e lint.** Rodar `pnpm test`/`pnpm exec vitest run` nos pacotes corretos. Build e lint de cada projeto conforme `package.json` local. **Refs:** RNF01–RNF03, CA01–CA12.
- [ ] **T47 — Verificar o fluxo integrado com duas contas.** Inspecionar e testar operação completa com duas contas. Verificar que uma mesma conta não consegue manter participação ativa em duas residências. **Refs:** RF01, RF05–RF06, RNF03, CA01, CA05–CA06.
- [ ] **T48 — Registrar capturas e acessibilidade.** Guardar capturas desktop/mobile das nove telas. Documentar divergências e revisar acessibilidade. **Refs:** RNF01–RNF02, CA12.
- [ ] **T49 — Preparar revisão e arquivamento.** Fazer PR pequeno e revisável. Atualizar a documentação a cada descoberta. Arquivar change só após aprovação. **Refs:** RNF01–RNF03, CA01–CA12.

## Verificação registrada

O checklist original mantém 13 itens pendentes. Entre eles estão a comparação com as nove [referências visuais](../../../docs/design-references/design-references/settings/README.md), a cobertura adicional de preferências e permissões individuais, a geração de alertas, a auditoria de temas e a verificação final. O estado acima registra a verificação da change de origem.
