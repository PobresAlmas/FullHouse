# Change: implementar Configurações/Perfil do FullHouse com fidelidade ao protótipo

## Why

`/settings` aparece na navegação, mas está intencionalmente desabilitado; falta a página. O protótipo visual enviado já define uma área de Perfil com subnavegação para Casa, Moradores, Permissões, Notificações e Preferências e suas cinco abas. O sistema tem parte das APIs, mas nenhuma interface unificada correspondente. O resultado atual não reproduz a experiência acordada no protótipo nem permite editar algumas configurações essenciais.

## What changes

- Criar a experiência responsiva `/settings` com **navegação interna fiel ao Figma exportado** e sem duplicar `/profile`.
- Integrar informações da residência, membros, política de permissões global e categorias da despensa às APIs existentes.
- Garantir que cada usuário tenha no máximo uma residência ativa, com proteção no serviço e no banco.
- Especificar e implementar novas operações de nome da casa e preferências persistidas, incluindo regras de acesso e validação.
- Construir centro de notificações com paginação e atualização periódica, respeitando o módulo já existente; não confundir a exibição de notificações gravadas com geração/entrega de alertas.
- Introduzir suporte verdadeiro aos três temas caso habilitados; verificar impacto em todo o aplicativo.
- Planejar níveis individuais de permissão do protótipo **sem fingir que a política global equivale a esses níveis**.
- Cobrir as telas com testes funcionais, de autorização e revisão visual referenciada.

## Non-goals

- Reescrever autenticação, tarefas, despesas, despensa ou a página de perfil pessoal.
- Recriar APIs de categorias já existentes.
- Criar chat, calendário, fundo de reserva ou canais externos de notificação como parte silenciosa desta change; a tela consulta periodicamente a API autenticada e não depende de WebSocket/SSE.
- Reproduzir dados fictícios do protótipo como dados reais.

## Requirements and references

- RF023: controle de permissões; RN001/RN002: isolamento da residência e política de criação/edição.
- RF022: despensa e categorias (integração de operação existente).
- RF017/RNF005: requisitos de notificação, dependentes de geração automática/eventos em outra mudança.
- `docs/design-references/settings/*.png`: nove referências visuais originais, leitura obrigatória.

## Impact

- Front: `app/(private)/settings/`, `features/settings/`, `components/layout/AppSidebar.tsx`, `AppPageHeader.tsx` e eventualmente estilos globais/tema.
- Backend: `src/residences/`, `src/notifications/`, DTOs e serviços de preferências (a introduzir após inspecionar schema).
- Banco: migrations somente após examinar `schema.prisma` real; preservação dos dados atuais.
- Testes: unidade, API, acesso e UI.

## Release boundaries

**Fase 1 (liberável):** estrutura fiel ao protótipo, Casa/Moradores leitura, política global de permissões, CRUD de categorias, notificações existentes paginadas com atualização periódica, regra de residência ativa única e navegação com perfil existente.

**Fase 2 (liberável somente com suporte real):** edição de casa, preferências persistidas, centro de notificações completo, temas, níveis individuais de permissão. Os itens podem ser separados em changes menores se a equipe preferir.
