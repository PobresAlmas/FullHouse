# Proposta: Implementar o painel de tarefas do FullHouse

## Why

A página de tarefas já existe, mas sua experiência ainda não acompanha os protótipos nem separa com clareza as tarefas da residência e as tarefas do usuário. Os filtros atuais não oferecem as filas de atrasadas e pendentes, tarefas concluídas não aparecem em “Todas” de forma consistente, e a criação não comunica bem responsáveis e tags. O fluxo de troca existente ocupa espaço com controles redundantes e restringe tarefas elegíveis; o avatar de conta no cabeçalho de Tarefas também não abre o menu disponível na Home.

Esta mudança organiza a tela em torno da residência ativa e do contexto pessoal do usuário, melhora legibilidade e interação e completa os fluxos de atribuição e troca respeitando as regras de acesso já existentes.

## What Changes

- Integrar a página de tarefas à residência selecionada e ao perfil autenticado, usando o nome cadastrado da residência e os membros ativos retornados pelo sistema.
- Disponibilizar contextos “Residência” e “Pessoal”; no pessoal, listar apenas tarefas pertencentes ao usuário autenticado ou atribuídas a ele, sem dados de outros moradores. Uma tarefa pessoal criada deve continuar visível ao voltar para o contexto “Pessoal”, inclusive após atualizar a lista.
- Trocar os filtros por “Todas”, “Atrasadas”, “Pendentes” e “Concluídas”; “Todas” inclui tarefas concluídas. Apresentar este grupo com o estilo visual de `references/filter.png`; não criar filtros adicionais de tipo ou visibilidade.
- Tornar obrigatório um responsável em toda tarefa, independentemente do contexto e da permissão de criação. Usuários sem permissão para atribuir a terceiros criam para si; os autorizados podem escolher responsáveis válidos. A interface não oferece responsável vazio e o servidor rejeita requisições sem responsável.
- Permitir solicitar troca em qualquer tarefa residencial aberta atribuída ao usuário autenticado, sem incluir tarefas pessoais. Um único ícone na tarefa abre um compositor compacto de moradores; o solicitante pode deixar a tarefa desejada em branco para o destinatário decidir ou sugerir uma tarefa pública aberta atribuída ao destinatário.
- No recebimento, mostrar a tarefa sugerida pré-selecionada quando houver; o destinatário pode confirmá-la ou escolher outra tarefa residencial aberta própria antes de aceitar. Sem sugestão, o destinatário decide. A troca altera as responsabilidades das duas instâncias em uma única operação.
- Garantir que tarefas privadas sejam visíveis somente ao seu proprietário/autorizado, com filtragem no servidor e proteção em leitura e escrita.
- Melhorar criação e edição de tarefas com seleção visual de responsáveis e tags, inclusão de novas tags e sugestões das tags já usadas. Corrigir também a apresentação das tags nos cartões e filtros de categoria do dashboard, seguindo `references/tasks-screeen.png`, com estados e contraste legíveis; melhorar o contraste de horário e lembrete.
- Implementar solicitações de troca de tarefas com estados e transições coerentes com o domínio existente.
- Ajustar textos, fontes, filtros, ícone do lembrete e responsividade para corresponder às referências fornecidas.
- Tornar o avatar no cabeçalho de Tarefas clicável e exibir o mesmo menu de conta da Home, com nome, e-mail e ação “Sair”.
- Padronizar a parte superior da tela de Tarefas com o cabeçalho compartilhado da Home, incluindo o controle Pessoal/residência, e alinhar o espaçamento responsivo do conteúdo logo abaixo do cabeçalho.

## Capabilities

### New Capabilities

- `task-dashboard`: contextos residencial/pessoal, listagem, filtros e apresentação visual da fila de tarefas.
- `task-assignment-and-privacy`: criação/atribuição e isolamento de tarefas públicas e privadas conforme identidade e permissão.
- `task-exchange-requests`: solicitação e resposta a trocas de tarefas entre moradores.

### Modified Capabilities

- Tarefas: atualizar a experiência existente, seus contratos de consulta e as regras de autorização necessárias para suportar o painel e as trocas.

## Impact

- **Frontend:** `web/features/tasks/`, rota autenticada de tarefas, acesso à residência/membros e componentes de filtros e formulário.
- **Backend:** módulo `backend/src/tasks/`, repositórios e DTOs; adicionar operações de solicitação de troca e aplicar a visibilidade privada nas consultas. Reutilizar os enums e entidades existentes quando adequados.
- **Dados:** o schema já contém escopo individual/residencial, tags, visibilidade, responsáveis e `solicitacao_troca_tarefa`; a migration desta change adiciona a segunda instância da troca sem invalidar solicitações antigas.
- **Compatibilidade:** preservar tarefas existentes e as políticas de criação/edição da residência. Não expor dados de uma residência diferente ou de outro usuário.

## Out of Scope

- Reformular Financeiro, Home, Despensa, Pets ou outros módulos.
- Criar um sistema geral de permissões novo; a mudança deve usar a política e os papéis já disponíveis.
- Alterar recorrência, penalidades ou regras de convivência além do necessário para manter a consistência da tarefa trocada.
- Incluir dados de demonstração como se fossem tarefas reais.

Os comportamentos e critérios de aceitação estão nas specs desta mudança; as decisões de integração e sequência de implementação estão em `design.md` e `tasks.md`.
