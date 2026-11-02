# Tasks — Implementar o painel de tarefas

> Execute na ordem sugerida e marque `[x]` somente após implementar e verificar. Consulte `proposal.md`, `design.md` e as três specs desta mudança. Use `references/` como referência visual; nunca use dados ilustrativos como conteúdo real.

## 1. Inspeção do domínio e contratos

- [x] 1.1 Revisar `schema.prisma`, migrações, repositório/serviço/controller e DTOs de tarefas; registrar semântica de escopo, visibilidade, tags, responsáveis, recorrência, lembretes e instâncias.
- [x] 1.2 Revisar `TasksPage`, API frontend, residência selecionada, autenticação e política de criação/edição; identificar o que já pode ser reutilizado.
- [x] 1.3 Confirmar papéis e configuração que autorizam atribuição a terceiros e autoatribuição; documentar a matriz efetiva sem criar permissões novas por inferência.
- [x] 1.4 Confirmar como uma tarefa `PRIVADA` identifica proprietário e leitores autorizados; conferir todas as rotas de listagem, detalhe, edição e troca.
- [x] 1.5 Decidir, a partir do domínio existente, se tarefas individuais terão persistência backend nesta mudança ou se há contrato atual suficiente; não considerar `localStorage` proteção de privacidade.
- [x] 1.6 Revisar estados e relacionamentos de `solicitacao_troca_tarefa`; definir alcance inicial da troca e se a troca permanente pode ser implementada com segurança.
- [x] 1.7 Registrar scripts de lint, testes e build já existentes em `web` e `backend`, bem como os componentes compartilhados adequados.

### Registro da inspeção

- `definicao_tarefa.escopo` separa `CASA` e `INDIVIDUAL`; a entidade já tem `visibilidade`, `tags` e `usuario_id`. As instâncias suportam responsável por participação ou usuário.
- A política residencial existente é `TODOS`/`LIDERES`; a change conserva essa regra. Quando o usuário não passa na política `LIDERES`, uma tarefa residencial precisa ser autoatribuída; apenas usuários autorizados pelo controle existente podem atribuir terceiros/rodízio.
- Privacidade atual: no contexto residencial, o responsável fixo é o proprietário legível de tarefa privada. A implementação atual bloqueia troca de tarefas privadas; esta change deve permitir uma solicitação dirigida ao destinatário escolhido e mostrar apenas os dados necessários para responder. Tarefas individuais usam `usuario_id` da definição e só são consultáveis pelo usuário autenticado.
- As tarefas individuais não tinham persistência API; serão adicionados endpoints autenticados sob `/tasks/personal` usando o modelo existente. Não é necessária migração prevista.
- A entidade de troca pode vincular uma segunda instância por `alvo_instancia_tarefa_id`; a migration compatível já existe e foi aplicada no banco local. O fluxo permite ao solicitante indicar opcionalmente uma tarefa pública aberta do destinatário como sugestão; sem indicação, o destinatário escolhe ao responder. A sugestão permanece editável pelo destinatário e não pode expor tarefas privadas.
- O `filter.png` define a aparência do grupo de filtros de status: “Todas”, “Atrasadas”, “Pendentes” e “Concluídas”. Não há segundo grupo de filtros por tipo/visibilidade.

## 2. Contratos de leitura e privacidade

- [x] 2.1 Atualizar consultas para aceitar o contexto e filtros necessários sem misturar residências ou escopo individual.
- [x] 2.2 Aplicar filtragem de tarefas privadas no servidor para listagem e detalhe; impedir acesso por ID direto a usuários sem autorização.
- [x] 2.3 Garantir que o contexto pessoal retorne apenas tarefas do usuário autenticado conforme propriedade/atribuição definida no domínio.
- [x] 2.4 Validar residência ativa, associação e IDs de responsável/participação em todas as operações.
- [ ] 2.5 Implementar ou ajustar testes de autorização para tarefas públicas/privadas, outros usuários, residência não autorizada e contexto pessoal.

## 3. Regras de criação e atribuição

- [x] 3.1 Aplicar no backend a política existente `TODOS`/`LIDERES` para criação e edição residencial.
- [x] 3.2 Tornar responsável obrigatório em toda tarefa e em qualquer política: remover “Sem responsável” da interface e rejeitar no servidor responsável ausente/nulo; usuários sem permissão atribuem a si mesmos e os autorizados podem selecionar somente membros ativos válidos ou rodízio não vazio.
- [x] 3.3 No contexto pessoal, restringir criação ao próprio usuário e não aceitar responsável alternativo; garantir que a tarefa criada continue listada após alternar de contexto e voltar ou refazer a consulta.
- [x] 3.4 Validar que todos os responsáveis selecionados pertençam à residência e estejam ativos.
- [ ] 3.5 Cobrir em testes tentativas permitidas e negadas por usuário/papel/política, incluindo IDs de usuário versus IDs de participação.

## 4. Solicitações de troca

- [x] 4.1 Redefinir a criação: a tarefa da linha é a instância proposta, a identidade vem da sessão e selecionar um morador ativo cria a solicitação; a tarefa desejada é opcional e pode ficar para o destinatário decidir.
- [x] 4.2 Permitir iniciar troca para qualquer tarefa residencial aberta atribuída ao usuário atual, incluindo pública/privada, fixa/recorrente/rodízio; excluir apenas tarefas pessoais, concluídas e canceladas.
- [x] 4.3 No fluxo de resposta, permitir que o destinatário aceite a tarefa sugerida ou escolha uma tarefa residencial aberta atribuída a ele; sem sugestão, ele decide. Aceitar troca as duas instâncias atomicamente e recusar preserva ambas.
- [x] 4.4 Impedir respostas repetidas, estados finais inválidos, destinatário fora da residência, auto-seleção e troca de instâncias comprometidas em outra solicitação pendente.
- [x] 4.5 Manter a troca pontual somente nas instâncias selecionadas; ao trocar instância recorrente ou de rodízio, preservar a definição de recorrência e a fila do rodízio.
- [x] 4.6 Substituir os três controles por tarefa por um único ícone e compositor compacto; permitir tarefa desejada opcional, distinguir moradores com nomes iguais e mostrar a sugestão ao destinatário, que pode mantê-la ou alterá-la.
- [ ] 4.7 Cobrir fluxo feliz, negação, duplicidade/concorrência, falhas transacionais, privacidade e tentativas não autorizadas com testes pertinentes.

## 5. Contextos e filtros da página

- [x] 5.1 Integrar a tela à residência autorizada e exibir o nome dinâmico, os membros ativos e estados distintos de carregamento, erro e ausência de dados.
- [x] 5.2 Implementar alternância Residência/Pessoal; limpar a lista anterior enquanto carrega, preservar apenas a seleção ainda autorizada e manter visíveis tarefas pessoais persistidas ao retornar ao contexto.
- [x] 5.3 Substituir “Todas | Minhas | Concluídas” por “Todas | Atrasadas | Pendentes | Concluídas” com os critérios definidos em `design.md`.
- [x] 5.4 Exibir concluídas em “Todas” e alinhar contadores com os mesmos critérios usados pela lista.
- [x] 5.5 Corrigir singular/plural de morador (incluindo “1 morador”) e demais rótulos conforme dados reais.
- [x] 5.6 Aplicar aos quatro filtros de status o estilo visual de `filter.png`; não adicionar filtros por tipo ou visibilidade.
- [ ] 5.7 Cobrir filtros, contagens, troca de contexto/residência (incluindo persistência visual de tarefas pessoais após voltar), listas vazias e falhas de consulta com testes pertinentes.

## 6. Formulário de tarefa, tags e categorias

- [x] 6.1 Adicionar interface para digitar e confirmar tag como chip; impedir duplicatas e permitir remover tags selecionadas.
- [x] 6.2 Mostrar tags preexistentes como sugestões somente a partir do contexto autorizado e indicar visualmente seleção/deseleção.
- [x] 6.3 Apresentar seleção de responsável/rodízio como chips ou componentes equivalentes ao protótipo, respeitando as permissões da sessão.
- [x] 6.4 Ajustar cores e apresentação visual das tags/categorias no dashboard e no formulário para contraste legível, preservando cor persistida e seleção perceptível sem depender apenas da cor.
- [x] 6.5 Melhorar contraste e legibilidade dos horários e lembretes; aproximar ícone e bloco de lembrete da referência `new-task.png`.
- [x] 6.6 Corrigir chips de tags nos cartões e chips dos filtros de categoria no dashboard conforme `tasks-screeen.png`, incluindo contraste, dimensões, espaçamento e estados selecionado/não selecionado.
- [ ] 6.7 Verificar criação, edição, validação e erros de API, incluindo responsável obrigatório em todos os contextos e políticas.

## 7. Fidelidade visual e acessibilidade

- [ ] 7.1 Ajustar fontes, dimensões, espaçamento e cartões da tela segundo `tasks-screeen.png`.
- [x] 7.2 Aplicar o estilo de `filter.png` aos quatro filtros de status e conferir estados selecionado, hover e foco; não criar filtros de tipo/visibilidade.
- [ ] 7.3 Conferir navegação por teclado, foco visível, labels, contraste, mensagens e anúncios de carregamento/erro.
- [ ] 7.4 Conferir responsividade em viewport estreita sem sobreposição ou perda dos controles essenciais.
- [x] 7.5 Tornar o avatar de conta no cabeçalho de Tarefas clicável e reutilizar o menu da Home com nome, e-mail e “Sair”; fechar por clique fora/Escape e manter navegação por teclado.
- [x] 7.6 Reutilizar `AppPageHeader` e o controle de contexto da Home em Tarefas; alinhar padding responsivo do conteúdo abaixo do cabeçalho.
- [x] 7.7 Ocultar a barra de rolagem do documento apenas na tela de Tarefas, preservando a rolagem e restaurando o padrão ao sair da página.

## 8. Verificação e entrega

- [ ] 8.1 Executar testes pertinentes de frontend e backend e corrigir regressões introduzidas.
- [x] 8.2 Executar lint, checagem de tipos e builds pelos scripts reais de cada pacote; registrar resultados.
- [ ] 8.3 Validar manualmente contexto residencial, pessoal, quatro filtros, criação com permissões distintas, privacidade, troca de tarefas próprias públicas/privadas/recorrentes/rodízio, resposta do destinatário e menu de conta.
- [ ] 8.4 Comparar a tela e o formulário às referências visuais, em desktop e viewport menor.
- [ ] 8.5 Verificar cenários das specs, registrar limitações de permissão/persistência/troca e revisar diff para remover dados temporários.
- [x] 8.6 Executar `openspec validate implement-tasks-dashboard --strict` e corrigir problemas de estrutura/semântica encontrados.

### Resultado da verificação

- Build NestJS, checagem TypeScript do frontend e ESLint direcionado aos arquivos alterados concluídos sem erros. `openspec validate --strict` já havia sido concluído. Não executei testes automatizados.
- O fluxo de troca usa o ícone/compositor de moradores e envia pedido para a tarefa da linha. O solicitante pode sugerir opcionalmente uma tarefa pública aberta do destinatário; o destinatário recebe a sugestão pré-selecionada e pode mantê-la ou escolher outra. Sem sugestão, decide por conta própria. A aceitação troca as responsabilidades das instâncias em uma transação. São aceitas instâncias abertas públicas/privadas, recorrentes e de rodízio; escopo pessoal, concluídas e canceladas ficam fora. O cabeçalho de Tarefas reutiliza `AppPageHeader` e os controles de contexto da Home; o conteúdo começa com o mesmo padding responsivo abaixo do cabeçalho.
- Testes automatizados, verificação manual dos fluxos, QA de viewport e comparação visual final continuam pendentes. Limitações: troca permanente não está disponível. Outros ambientes precisam aplicar as migrations necessárias antes de habilitar o fluxo.
