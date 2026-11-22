# Tarefas — implementar Configurações (não iniciadas)

> Antes de codar: conferir `docs/design-references/REVISAO-ANTES-DE-CODAR.md`, `design.md` e as nove referências em `docs/design-references/design-references/settings/`. Marcar `[x]` apenas com código e teste correspondente. Se o repositório real divergir da árvore inspecionada, revisar a spec, não inventar caminho.

## 0. Reconhecimento

- [x] 0.1. Executar `git status`, inspecionar configs existentes, `package.json`, `schema.prisma`, migrations, testes e `openspec/specs/`; identificar convenções e conflitos.
- [x] 0.2. Mapear estrutura, contratos e estado de `AppSidebar`, `AppPageHeader`, `/profile`, `ResidenceAccessService`, APIs de categorias e notificações.
- [x] 0.3. Validar/ajustar decisões do arquivo `docs/REVISAO-ANTES-DE-CODAR.md`; estabelecer baseline com testes existentes.
- [ ] 0.4. Montar comparação visual com os nove PNGs: desktop 1512×982 e mobile ~390×844.
- [x] 0.5. Garantir no backend e no PostgreSQL que cada usuário tenha no máximo uma participação ativa global; participações históricas encerradas continuam permitidas.

## 1. Shell e navegação (fase 1)

- [x] 1.1. Criar `app/(private)/settings/page.tsx` e `features/settings/components/SettingsPage.tsx`.
- [x] 1.2. Criar subnavegação `Minha conta | Casa | Moradores | Permissões | Notificações | Preferências` e manter link para `/profile`.
- [x] 1.3. Implementar query params `section`/`tab`, estados inválidos, teclado, mobile, aria.
- [x] 1.4. Reusar `AppSidebar`/`AppPageHeader`, obedecer referências de fundo, bordas, lavanda/verde e cartões.
- [x] 1.5. Habilitar `settings` em `implementedSections` **somente quando ao menos a fase 1 estiver funcional**; tornar o atalho do cabeçalho navegável quando autorizado.
- [x] 1.6. Testar navegação, reload em aba específica, sem residência, sem auth e layout responsivo.
- [x] 1.7. Exibir notificações reais na seção Notificações, com filtro geral/não lidas, paginação e atualização periódica autenticada; manter o sino compatível. Atualização periódica não cria promessa de eventos que o backend ainda não gera.

## 2. Casa e Moradores (fase 1 e complemento da fase 2)

- [x] 2.1. Integrar `getResidences()`, selecionar residência explicitamente e implementar loading/erro/empty.
- [x] 2.2. Integrar GET de membros já existente; auditar tipo real e manter privacidade, estado vazio.
- [x] 2.3. Exibir Casa/Moradores com cartões, datas e papéis, sem dados hardcoded.
- [x] 2.4. Implementar PATCH para nome da casa se ausente: DTO, controller, access service, repository, testes de autorização, sincronização da sidebar.
- [x] 2.5. Cobrir edição permitida, nome inválido, usuário sem residência e cross-residence.

## 3. Permissões (fase 1)

- [x] 3.1. Reutilizar `getResidencePermissionSettings` e `updateResidencePermissionSettings` (`TODOS|LIDERES`).
- [x] 3.2. Exibir política global fiel ao estilo do protótipo **sem** fingir ser a permissão individual visual.
- [x] 3.3. Bloquear edição para não gestores no frontend; verificar 403 no backend.
- [x] 3.4. Persistir alteração, recarregar e verificar que guardas de criação/edição existentes obedecem a política.

## 4. Categorias (fase 1)

- [x] 4.1. Reusar API de pantry/categories e componente/modal existente quando compatível.
- [x] 4.2. Implementar lista, criar, editar, confirmar exclusão, erros de duplicidade/categoria com itens.
- [x] 4.3. Atualizar dados da despensa após modificação; testar com gerente e não gerente.

## 5. Preferências persistidas (fase 2)

- [x] 5.1. Ler schema Prisma real e modelar preferências por `userId + residenceId`, com defaults, unicidade e migration segura.
- [x] 5.2. Criar DTOs para `GET/PATCH .../settings/preferences`, validação de objetos aninhados, partial PATCH e controle de acesso.
- [x] 5.3. Implementar `Geral`: preferências de notificação persistidas com controles liga/desliga; geração dos eventos permanece separada.
- [x] 5.4. Implementar `Despensa`: prazo, mostrar vencidos; aplicar filtro realmente na visualização.
- [x] 5.5. Implementar `Financeiro`: prazo, mostrar atrasadas; aplicar filtro realmente na visualização.
- [x] 5.6. Implementar `Pets`: vacinas, vermífugo, consultas; conectar a eventos reais antes de prometer avisos.
- [ ] 5.7. Cobrir salvamento, refresh, logout/login, dados inválidos e isolamento entre moradores.

## 6. Notificações (fase 2)

- [x] 6.1. Adaptar GET existente com paginação determinística sem quebrar `NotificationBell`.
- [x] 6.2. Implementar centro de notificações com lidas/não lidas, carregar mais, loading/erro, uso de `markNotificationRead`.
- [ ] 6.3. Identificar e implementar dependências de geração de alertas antes de habilitar promessas de notificação; registrar mudanças extras em change separada se sair do escopo.
- [x] 6.4. Testar paginação, contagem, privacidade e controle de preferência.

## 7. Permissões individuais (fase 2, só com suporte de autorização completo)

- [x] 7.1. Validar modelagem do override de edição e sua relação com `LIDER/ADMINISTRADOR/MORADOR` e `TODOS/LIDERES`.
- [x] 7.2. Criar migration, endpoint de atualização por membro e resposta de permissão efetiva.
- [x] 7.3. Adaptar guardas de conteúdo para considerar override; separar exclusão e ações pessoais das operações de gestão.
- [x] 7.4. Expor seleção de `Pode editar`/`Somente leitura` por morador e remoção protegida no menu de ações.
- [ ] 7.5. Testar endpoint direto de morador sem permissão, cruzamento de residência, gestor, herança de política e rollback.

## 8. Tema e estética (fase 2)

- [ ] 8.1. Extrair tokens de cores para claro/escuro e auditar cores hardcoded em componentes existentes.
- [ ] 8.2. Implementar seletor Claro/Escuro/Sistema, `localStorage` e `prefers-color-scheme` sem hydration warnings.
- [ ] 8.3. Validar tema em Home, Tarefas, Financeiro, Perfil, Settings, modais e estados de erro.
- [ ] 8.4. Comparar screenshots originais, não alterar o design de outras páginas sem necessidade.

## 9. Qualidade e entrega

- [ ] 9.1. Unit/UI dos componentes e serviço API; backend unit e HTTP de 200/400/403/404/409.
- [ ] 9.2. Rodar `pnpm test`/`pnpm exec vitest run` nos pacotes corretos; build e lint de cada projeto conforme `package.json` local.
- [ ] 9.3. Inspecionar e testar operação completa com duas contas; verificar que uma mesma conta não consegue manter participação ativa em duas residências.
- [ ] 9.4. Guardar capturas desktop/mobile das nove telas; documentar divergências e revisar acessibilidade.
- [ ] 9.5. Fazer PR pequeno e revisável; atualizar `openspec` a cada descoberta; arquivar change só após aprovação.
