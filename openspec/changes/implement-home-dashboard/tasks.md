# Tasks — Implementar a Home do FullHouse

> Execute as atividades na ordem sugerida e marque `[x]` somente após implementação e verificação. Consulte `proposal.md`, `design.md` e as três `spec.md` desta mudança. Os protótipos fornecidos são a referência visual. **O nome exibido para a residência deve vir dos dados cadastrados**, nunca de uma string fixa.

## 1. Preparação e verificação dos contratos existentes

- [x] 1.1 Inspecionar o schema Prisma, o módulo de residências, os DTOs, as regras de participação e os papéis existentes; documentar os campos realmente necessários para criar uma residência e associar o criador.
- [x] 1.2 Conferir os clientes HTTP, os tipos e as rotas existentes no frontend para residências, tarefas, despesas, membros e autenticação; listar o que pode ser reutilizado.
- [x] 1.3 Verificar como o backend representa tarefas de escopo pessoal, responsáveis e participação; distinguir IDs de usuário e de participação antes de definir filtros.
- [x] 1.4 Confirmar se há fonte persistida e semanticamente correta para vencimentos de contas e avisos da residência. Se não houver, registrar a limitação e utilizar o estado vazio/indisponível previsto no design, sem criar dados fictícios ou inferir vencimentos de datas de lançamento.
- [x] 1.5 Verificar os scripts existentes de lint, testes e build em `backend` e `web`, e os componentes visuais reutilizáveis; não substituir a arquitetura atual por outra.

### Registro da inspeção

- Criação: `casa` exige `nome` (até 150 caracteres) e `criada_por_usuario_id`; `participacao` exige `casa_id`/`usuario_id`, usa `papel` e `data_saida` nula para vínculo ativo; `configuracao_casa` é opcional no schema e possui defaults. O papel inicial compatível é `LIDER`.
- Reuso frontend: `getResidences`, `getTasks`, `getTaskMembers`, `getExpenses`, cliente Axios com cookies e `useAuth`; sidebar e componentes Tailwind existentes. A rota privada mantém `ProtectedRoute`.
- Tarefas: `definicao_tarefa.escopo` separa CASA/INDIVIDUAL; instâncias guardam `responsavel_participacao_id` e `responsavel_usuario_id`, que não são IDs intercambiáveis.
- Dados: `despesa.data_vencimento` é o vencimento persistido e o backend o mapeia para `date`; notificações existem, mas não há contrato de mural de avisos residencial. O cartão de aviso deve permanecer vazio.
- Comandos disponíveis: backend usa Vitest, ESLint e Nest build; web usa Vitest, ESLint e Next build. Nenhuma mudança de schema/migração é necessária para estes dados.

## 2. Criação de residência no backend

- [x] 2.1 Criar DTO de entrada para `POST /residences` com validação e normalização do nome; rejeitar valores vazios e entradas fora dos limites definidos.
- [x] 2.2 Adicionar rota autenticada `POST /residences` ao controller existente, obtendo a identidade do criador exclusivamente do JWT, sem aceitar papel ou ID do criador no corpo da requisição.
- [x] 2.3 Implementar no service o caso de uso de criação, reutilizando as convenções e os papéis já existentes no projeto.
- [x] 2.4 Implementar no repository uma transação Prisma que crie a casa, a participação ativa do criador como responsável e a configuração inicial, **se exigida pelo schema**; garantir rollback se qualquer etapa falhar.
- [x] 2.5 Definir uma resposta segura e compatível com o contrato de residência utilizado pelo frontend, incluindo identificador e nome persistido.
- [ ] 2.6 Criar testes para autenticação obrigatória, validação de nome, vínculo/papel inicial, resposta de sucesso e rollback em falha de associação; verificar o comportamento com o banco de testes.

## 3. Estrutura da Home e integração com residências

- [x] 3.1 Criar a feature de Home seguindo os padrões existentes de Next.js/React/Tailwind, reutilizando componentes compartilhados e evitando componentes ou abstrações triviais sem finalidade.
- [x] 3.2 Substituir o redirecionamento da rota privada `/` para `/finance` pela nova Home, preservando a proteção de autenticação existente.
- [x] 3.3 Integrar `GET /residences` e distinguir claramente os estados `loading`, `error`, `no-residence` e `has-residence`; não interpretar falha de rede como ausência de residência.
- [x] 3.4 Implementar a seleção da residência ativa dentre as associações autorizadas; se a residência selecionada perder autorização, invalidar seu estado e descartar dados anteriores.
- [x] 3.5 Exibir o nome real da residência nos títulos e no seletor, atualizando a Home corretamente ao alternar entre residências sem misturar dados.
- [x] 3.6 Habilitar a navegação Home na sidebar, mantendo as demais rotas funcionais e respeitando a navegação simplificada para usuários sem residência.

## 4. Home do usuário sem residência

- [x] 4.1 Reproduzir a apresentação visual, hierarquia, texto e posicionamento do formulário da Home sem residência conforme os protótipos, incluindo a variação de navegação com Perfil selecionado sem inventar uma página de perfil fora do escopo.
- [x] 4.2 Implementar campo de nome e envio do formulário com validação acessível, estados de envio e bloqueio de duplo clique durante a requisição.
- [x] 4.3 Integrar o formulário a `POST /residences`; em sucesso, atualizar a lista de residências e abrir a Home da residência recém-criada.
- [x] 4.4 Exibir erros reais de criação com possibilidade de nova tentativa, sem perder indevidamente o valor digitado.
- [x] 4.5 Testar renderização sem residência, validação do formulário, falha de consulta, falha de criação e criação bem-sucedida.

## 5. Consultas autorizadas e métricas do dashboard

- [x] 5.1 Definir os tipos/DTOs mínimos da Home e reutilizar endpoints existentes quando suficientes; adicionar consulta agregada específica somente para dados ou filtros que os contratos atuais não ofereçam.
- [x] 5.2 Garantir no backend autorização por participação ativa para dados da residência; no modo pessoal, derivar o usuário do JWT e filtrar tarefas e despesas pelo vínculo pessoal real, nunca apenas por filtragem no navegador.
- [x] 5.3 Implementar a obtenção de tarefas atrasadas e de hoje por contexto, excluindo tarefas concluídas/canceladas conforme as regras do domínio e evitando contagem dupla.
- [x] 5.4 Implementar o resumo semanal e seus estados vazios, explicitando a regra de cálculo utilizada e aplicando consistentemente os limites de dia/semana no fuso `America/Fortaleza` definido provisoriamente no design.
- [x] 5.5 Obter membros e respectivos dados autorizados da residência para o cartão correspondente, sem expor campos desnecessários.
- [x] 5.6 Implementar o cartão de contas próximas **somente a partir de um vencimento real**. Sem fonte válida, apresentar o estado indisponível/vazio previsto e registrar o bloqueio; não adicionar migração ou alterar o conceito de despesa sem decisão de domínio.
- [x] 5.7 Integrar avisos reais apenas se houver recurso e autorização adequados; caso contrário, exibir estado vazio sem copiar o conteúdo demonstrativo do protótipo.
- [x] 5.8 Tratar consultas independentes com carregamento e falha por cartão quando possível; evitar que a falha de um bloco derrube todo o dashboard.

## 6. Home da residência

- [x] 6.1 Reproduzir o cabeçalho e o seletor de contexto usando o nome dinâmico da residência selecionada e a saudação derivada do usuário autenticado.
- [x] 6.2 Implementar os cartões de tarefas atrasadas, tarefas do dia, contas próximas, avisos, resumo semanal e moradores com dados reais ou estados vazios explícitos.
- [x] 6.3 Conectar ações de navegação dos cartões apenas a páginas existentes e autorizadas; não criar links sem destino funcional.
- [x] 6.4 Implementar alternância para modo Pessoal e troca de residência, limpando dados de outro contexto enquanto as novas consultas carregam.
- [x] 6.5 Testar cartões com dados, sem dados, falha parcial, troca entre residências e impedimento de acesso a residência não autorizada.

## 7. Home pessoal

- [x] 7.1 Reproduzir o visual específico do modo Pessoal, incluindo indicador de modo selecionado e o cartão informativo próprio desse contexto.
- [x] 7.2 Exibir tarefas atrasadas, tarefas de hoje, contas próximas e resumo semanal **somente do usuário autenticado**, respeitando a semântica dos modelos e dos vínculos pessoais.
- [x] 7.3 Não apresentar membros ou dados coletivos de outros moradores no contexto pessoal; garantir que o backend não retorne informações indevidas.
- [x] 7.4 Implementar retorno ao modo da residência preservando uma seleção de residência ainda autorizada.
- [x] 7.5 Testar isolamento dos dados pessoais, ausência de dados, falha parcial e alternância de contextos.

## 8. Fidelidade visual, acessibilidade e responsividade

- [ ] 8.1 Comparar a Home sem residência (com Home selecionada) ao respectivo protótipo e ajustar sidebar, espaçamentos, tipografia, cores e formulário.
- [ ] 8.2 Comparar a variação sem residência com Perfil selecionado ao respectivo protótipo, respeitando o escopo de navegação definido.
- [ ] 8.3 Comparar a Home da residência ao protótipo, usando dados de teste controlados para conferir a composição, sem fixar exemplos no código de produção.
- [ ] 8.4 Comparar a Home pessoal ao protótipo com o mesmo critério de fidelidade visual.
- [ ] 8.5 Conferir responsividade em viewport menor, sem sobreposição de cartões nem perda de conteúdo essencial.
- [ ] 8.6 Verificar navegação por teclado, foco visível, textos acessíveis, mensagens de erro e indicadores de carregamento.

## 9. Verificação final e entrega

- [x] 9.1 Executar os testes automatizados pertinentes do backend e frontend; corrigir falhas introduzidas pela mudança.
- [x] 9.2 Executar lint, checagem de tipos quando houver script e build usando os comandos reais de cada pacote; registrar resultados.
- [ ] 9.3 Validar manualmente o fluxo completo: usuário sem residência → criação → Home da residência → modo Pessoal → retorno à residência.
- [ ] 9.4 Validar também múltiplas residências, perda de permissão, erros de rede, dados vazios e proteção de informações de outros usuários.
- [x] 9.5 Conferir cada cenário das três `spec.md`, documentando o que foi atendido e qualquer limitação funcional remanescente, sobretudo vencimentos e avisos sem fonte persistida.
- [x] 9.6 Executar `openspec validate implement-home-dashboard --strict` e corrigir problemas de especificação identificados.
- [ ] 9.7 Capturar evidências das quatro variações visuais e dos testes para a entrega acadêmica; revisar o diff e remover mocks ou dados temporários de produção.

### Resultado da verificação dos cenários

- Home sem residência: carregamento, erro distinto de lista vazia, formulário, validação, falha e sucesso de criação foram cobertos por testes de frontend; rota de criação coberta por testes HTTP autenticados.
- Home residencial: seleção validada pela lista autorizada, tarefas/membros/despesas carregadas por endpoints existentes e erros apresentados por cartão; troca entre residências e descarte de dados anteriores cobertos.
- Home pessoal: endpoint deriva o usuário do JWT e filtra tarefas/despesas de escopo individual no banco; os testes verificam os filtros, estados vazios, falha parcial, alternância e ausência de membros da residência.
- Métricas usam semana de segunda a segunda no fuso `America/Fortaleza`; testes cobrem o limite UTC/local, virada do ano, tarefas concluídas/canceladas, atraso e semana vazia.
- Vencimentos são persistidos em `despesa.data_vencimento`; avisos permanecem indisponíveis porque notificações não representam um mural residencial.
- Limitações de verificação: a criação foi exercitada com transação simulada e teste HTTP com serviço mockado, não contra banco de teste isolado; não foi possível capturar screenshots da implementação nem verificar a viewport móvel em navegador automatizado neste ambiente.
- Resultados verificados: frontend Vitest 53 arquivos/150 testes; backend Vitest 30 arquivos/172 testes e e2e 7 arquivos/33 testes. Builds Next/Nest passaram, assim como ESLint nos testes backend alterados e Prettier nos arquivos de teste alterados. A criação ainda não foi verificada contra banco isolado, e screenshots/viewport móvel continuam pendentes.
