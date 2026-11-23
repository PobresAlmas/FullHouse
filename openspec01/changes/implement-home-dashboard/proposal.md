# Proposta: Implementar a página inicial do FullHouse

## Why

Atualmente, a rota inicial da área autenticada do FullHouse redireciona o usuário para a página financeira, pois a Home apresentada nos protótipos foi implementada em `page.tsx` mas não é usada. Isso impede que o usuário tenha uma visão geral das informações relevantes para o seu dia e dificulta o primeiro acesso de quem ainda não participa de uma residência.

A mudança tem como objetivo implementar a Home de acordo com os protótipos fornecidos, respeitando a identidade visual existente e adaptando seu conteúdo ao contexto do usuário: sem residência, visão da residência ou visão pessoal.

## What Changes

- Substituir o redirecionamento da rota inicial autenticada por uma Home funcional, baseada nos protótipos de referência.
- Exibir uma apresentação inicial e a opção de criar uma residência quando o usuário não estiver associado a nenhuma.
- Permitir a criação de residência e vincular o usuário criador conforme as regras de permissões do sistema; incluir o suporte necessário no backend, pois a API atual não disponibiliza essa operação.
- Disponibilizar uma visão da residência com os blocos de informações previstos no protótipo, como tarefas, contas, avisos, resumo semanal e moradores, aproveitando funcionalidades e dados existentes quando aplicável.
- Disponibilizar uma visão pessoal com as informações pertinentes ao usuário, conforme o protótipo.
- Permitir alternar entre a visão pessoal e a visão da residência, exibindo dinamicamente o **nome da residência cadastrada**, sem nomes fixos no código.
- Atualizar a navegação da aplicação para permitir o acesso à Home, preservando os demais módulos existentes.
- Reproduzir com fidelidade o layout, a tipografia, as cores, os componentes e os estados visuais apresentados nos protótipos, com comportamento responsivo coerente com a aplicação.
- Tratar carregamento, ausência de dados e falhas de requisição sem inventar valores ou exibir conteúdo de exemplo como se fosse real.

## Capabilities

### New Capabilities

- `home-without-residence`: experiência inicial de usuário sem residência, incluindo a criação e associação à residência.
- `residence-home`: painel inicial contextualizado pela residência selecionada, com informações agregadas e identificação pelo nome cadastrado da residência.
- `personal-home`: painel inicial com informações individuais e alternância entre os contextos pessoal e residencial.

### Modified Capabilities

- Navegação autenticada: habilitar o acesso à Home e substituir o redirecionamento atual para o Financeiro.
- Gestão de residências: disponibilizar a operação de criação de residência e sua associação inicial ao usuário, respeitando a política de acesso existente.

## Impact

- **Frontend:** rota `app/(private)/page.tsx`, navegação lateral, componentes da Home, camada de integração com a API e testes pertinentes.
- **Backend:** módulo de residências, com o endpoint, validações, serviço, persistência e testes necessários à criação da residência. Outros endpoints ou ajustes de resposta somente serão adicionados se a especificação identificar dados essenciais ainda indisponíveis.
- **Experiência do usuário:** a rota inicial passa a oferecer um painel contextualizado em vez de redirecionar diretamente ao Financeiro.
- **Compatibilidade:** preservar autenticação, autorização, dados existentes e o funcionamento das demais funcionalidades do FullHouse.

## Out of Scope

- Reformulação visual ou funcional dos módulos de Financeiro, Despensa, Pets e demais páginas já implementadas.
- Inclusão de funcionalidades que não estejam previstas nos protótipos ou não sejam necessárias para a Home funcionar.
- Alterações estruturais amplas na arquitetura do backend sem relação direta com esta entrega.

Os comportamentos detalhados, critérios de aceitação e decisões técnicas serão definidos, respectivamente, nos arquivos `spec.md` e `design.md` da mudança.
