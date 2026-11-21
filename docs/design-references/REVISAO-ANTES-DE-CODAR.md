# Decisões de produto e arquitetura — revisar antes de implementar

Este pacote faz escolhas **propostas**, não afirmações retiradas do PDF. Marcar `[x]` após concordar ou editar o documento.

- [x] **Navegação**: manter `/profile` para dados pessoais e criar `/settings` como hub de configurações. A navegação interna de `/settings` reproduz o protótipo: `Minha conta` (link para `/profile`), `Casa`, `Moradores`, `Permissões`, `Notificações`, `Preferências`. Evitar implementar segunda edição de perfil.
- [x] **Rota canônica**: usar `/settings?section=house|members|permissions|notifications|preferences&tab=general|categories|pantry|finance|pets` (somente `tab` quando `section=preferences`). Entradas inválidas normalizam para valores válidos. Aba padrão `house`; em Preferências `general`.
- [x] **Residência única**: cada usuário pode ter no máximo uma participação ativa entre todas as residências. `/settings` usa a residência retornada por `GET /residences`; não oferece seletor. A regra deve ser validada no serviço e protegida por índice único parcial no banco. Participações históricas encerradas são permitidas.
- [x] **Permissões individuais**: preservar os papéis estruturais e adicionar override individual de edição (`null` herda `TODOS/LIDERES`), aplicar a regra nas operações de conteúdo antes de expor os seletores. Administrador continua reservado a `LIDER/ADMINISTRADOR`.
- [x] **Casa / moradores**: editar nome da residência é operação nova; obter informações e a lista dos moradores pelos serviços existentes quando possível. Para ações não suportadas (ex.: remover membro, transferir liderança) não exibir botões ativos sem backend.
- [x] **Categorias**: usar o CRUD já existente em `residences/:id/pantry/categories`. Não criar uma segunda tabela/CRUD paralelo. Respeitar proibição de remover categoria com itens associados.
- [x] **Preferências de alertas**: armazenar por **usuário + residência** (preferências de quem recebe); configurações globais da casa (nome, política) ficam por residência. Datas e limites padrão são sugestões deste pacote, editáveis antes da implementação.
- [x] **Notificações**: a seção `/settings?section=notifications` lista notificações reais do usuário autenticado, com filtro de lidas/não lidas e atualização periódica via API. Isso exibe eventos já gravados; não cria geradores de alertas inexistentes. Não requer WebSocket/SSE nem nova infraestrutura externa.
- [x] **Tema**: `Claro | Escuro | Sistema` do protótipo exige adaptar telas existentes que têm cores hardcoded. Não usar toggle cosmético que só muda a página de Configurações. Preferência proposta por dispositivo (`localStorage`, chave `fullhouse:theme`); sistema reage a mudanças de tema do SO quando em `Sistema`.
- [x] **Datas de aviso**: sugestão de antecedência selecionável `1, 3, 5, 7, 14` dias; padrão `5` para despensa e financeiro. Preferências de exibição de vencidos/atrasadas padrão `true`; confirmação com time antes de migrations.
- [x] **Acesso**: somente membro ativo da residência pode ler configurações da casa; somente LIDER/ADMINISTRADOR edita configurações da casa, com validação no servidor. Preferências pessoais podem ser alteradas pelo próprio usuário.
- [x] **Escopo**: implementar todas as nove telas como UI integrada; quando a dependência de outros módulos (geração de alertas, papéis individuais) não existir, criar **tarefas explícitas**, sem placeholders fingindo ser funcionalidade concluída.

## Riscos reais

1. Este repositório contém `backend/prisma/schema.prisma` e migrations em `backend/prisma/migrations`; decisões de banco devem seguir o schema atual.
2. `AppSidebar` desabilita `settings` em `implementedSections` e ainda não há rota `web/app/(private)/settings/page.tsx`.
3. Backend mantém a política global e expõe também o acesso efetivo por membro, com override individual de edição e remoção protegida.
4. `ProfilePage` já edita nome/e-mail/senha/avatar; a nova subnavegação deve apenas encaminhar para `/profile`.
5. A API de notificações existente retorna no máximo quatro itens e contagem de não lidas. Para a tela de Configurações, ampliar com paginação mantendo compatibilidade com o sino. A atualização periódica consulta dados já persistidos e não representa geração de alertas futuros.
6. As nove imagens estão em `docs/design-references/design-references/settings/` (1512×982); este arquivo está em `docs/design-references/REVISAO-ANTES-DE-CODAR.md`.

## Definição de pronto

Não marcar a change como pronta enquanto: build e testes passarem, permissões forem testadas no backend, unicidade de residência ativa for protegida no serviço e no banco, dados persistirem após reload, mobile estiver usável, referências visuais forem comparadas e não houver controle interativo que não faça nada.
