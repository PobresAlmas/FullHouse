# Design

## Context

O esquema Prisma já contém `conversa`, `mensagem`, `leitura_conversa`, `regra_convivencia`, `proposta_regra`, `reuniao` e `participante_reuniao`. Atualmente, esses modelos não são expostos por módulos da aplicação nem por páginas privadas. O chat precisa de um canal em tempo real do servidor para o cliente. O Nest já utiliza autenticação JWT baseada em cookies, e o RxJS já está presente entre as dependências do backend.

Consulte `proposal.md` para a motivação e `specs/` para os requisitos observáveis.

## Goals / Non-Goals

**Objetivos:**

- Implementar os três requisitos sobre os dados existentes de residência e participação, garantindo o isolamento entre residências em cada requisição e conexão em tempo real.
- Reutilizar os registros existentes do Prisma para mensagens, regras, reuniões e convites.
- Entregar novas mensagens do chat aos membros conectados e recuperar o histórico após a reconexão.

**Fora do escopo:**

- Notificações gerais, envio por push ou e-mail, indicadores de presença, indicação de digitação, reações a mensagens ou mensagens diretas.
- Regras ou chats específicos de subgrupos, fluxos de votação para alterações de regras e chamadas de vídeo ou áudio em reuniões.
- Distribuição de mensagens entre múltiplas instâncias. O serviço atual é executado em um único processo de backend. Um intermediário compartilhado de mensagens poderá ser introduzido se a implantação passar a escalar horizontalmente.

## Decisions

### 1. Usar a participação existente na residência como fonte de autorização

Identificar a `participacao` ativa do usuário na `casa` solicitada para operações de chat, regras e reuniões. Não confiar em um ID de participação fornecido pelo cliente nem na existência de uma conversa, regra, reunião ou convite como prova de participação atual. Validar a resposta a um convite tanto pela participação ativa na residência quanto pelo registro `participante_reuniao` da reunião.

Isso reutiliza a mesma fronteira de acesso por casa dos outros módulos e impede que tentativas de adivinhar identificadores exponham dados de outras residências. As requisições HTTP utilizam o guard JWT existente e um comportamento consistente para `401`/`403`/`404`. As operações de escrita continuam passando pela proteção de origem existente.

### 2. Usar REST para o histórico e o envio de mensagens, com Server-Sent Events para o recebimento

Expor operações REST autenticadas para obter a conversa da residência, consultar o histórico ordenado e persistir mensagens. Adicionar um endpoint SSE autenticado para mensagens em tempo real. O SSE é unidirecional, o que corresponde ao requisito: os clientes enviam por REST e recebem eventos enviados pelo servidor. Essa solução utiliza a dependência RxJS existente e evita introduzir uma biblioteca WebSocket ou manter um segundo protocolo para a criação de mensagens.

A conexão SSE é aberta com credenciais para que o cookie JWT existente, com atributo HTTP-only, possa autenticá-la. O gateway verifica a participação ativa na conexão e encerra a conexão ou interrompe a entrega quando a participação é revogada. Os eventos usam o ID da mensagem persistida como seu identificador. Na reconexão, o cliente busca o histórico posterior ao último ID recebido, para que uma queda de conexão não cause perda silenciosa de mensagens.

O backend transmite as mensagens somente após a confirmação da transação no banco. O canal em tempo real é agrupado pelo ID da conversa e removido na desconexão. A distribuição ocorre dentro do processo. A escalabilidade horizontal exigiria um adaptador compartilhado de publicação e assinatura, fora do escopo desta alteração.

### 3. Manter uma conversa por residência, preservando as conversas de subgrupos

Usar `conversa` com `tipo = CASA` e o ID da residência para o chat do grupo. Manter inalterado o comportamento de `tipo = SUBGRUPO` e de `subgrupo_id`. Obter ou criar a conversa da casa sob demanda.

O esquema não garante atualmente uma única conversa `CASA` por residência. Adicionar um índice único parcial do PostgreSQL restrito a `tipo = CASA` se a inspeção das migrações confirmar que o banco atual é compatível. A migração deve falhar com uma mensagem de diagnóstico que indique como proceder caso já existam conversas de casa duplicadas. Ela não deve mesclar nem excluir automaticamente o histórico de mensagens. Em caso de conflito de unicidade causado por criações concorrentes, carregar a conversa já criada.

### 4. Usar `regra_convivencia` para o mural da residência sem acionar a votação de propostas

Armazenar as entradas do mural da casa com `escopo = CASA`, `status = VIGENTE`, a residência atual e o criador autenticado. Usar `criada_por_participacao_id` para a autoria original e `atualizada_por_participacao_id` para o último editor. Em uma regra que nunca foi editada, exibir o criador como último editor. Registrar o momento do cadastro usando o valor padrão existente de `criado_em`.

Qualquer membro ativo da residência pode criar e editar uma regra da residência, seguindo o papel de "morador" da história de usuário e o requisito explícito de identificar o último editor. Não criar propostas nem votos: essas são capacidades distintas do esquema, não solicitadas pelo RF012. O mural filtra as regras vigentes da casa e exclui regras revogadas da visualização padrão.

O modelo atual contém todos os campos necessários, portanto não há migração planejada para a tabela de regras.

### 5. Usar transações para os registros de reuniões e participantes

Criar uma `reuniao` e registros pendentes de `participante_reuniao` para todas as participações ativas da residência em uma única transação, incluindo o organizador. Persistir a pauta enviada em `pauta`. Como o esquema atual exige `titulo`, mas o requisito não solicita um título separado, derivar um título conciso dos primeiros 150 caracteres da pauta, em vez de solicitar uma informação redundante.

As respostas atualizam somente o convite do membro autenticado e preenchem `respondido_em`. O reagendamento mantém a reunião original com o status `REAGENDADA`, cria uma substituta vinculada por `reagendada_de_id` e cria novos convites pendentes para todos os membros atuais em uma única transação. O cancelamento marca a reunião existente como `CANCELADA`. Nenhuma das ações exclui o histórico. Somente o membro identificado por `criada_por_participacao_id` pode reagendar ou cancelar.

Usar datas e horários ISO-8601 com deslocamento de fuso explícito na interface da API e `timestamptz` do PostgreSQL na persistência. Os modelos existentes de reunião e participante representam esses comportamentos, portanto não há migração de esquema planejada para eles.

### 6. Adicionar módulos de backend e páginas privadas de frontend específicos

Manter as responsabilidades do backend separadas em módulos `chat`, `house-rules` e `meetings`, com controladores, serviços, repositórios e DTOs seguindo os módulos Nest existentes. Adicionar páginas privadas e clientes de API correspondentes e integrá-los à navegação privada existente. A seleção compartilhada de residência e as verificações de participação ativa devem reutilizar os serviços existentes de acesso à residência quando suas APIs forem adequadas.

Isso mantém a autorização e a validação testáveis sem reunir as três capacidades em um único serviço genérico. Adicionar testes unitários para as regras de serviços e repositórios, testes HTTP para os contratos de autenticação e autorização, testes de interface para os principais fluxos e testes específicos de conexão SSE, entrega, isolamento e limpeza na desconexão.

## Risks / Trade-offs

- [Uma conexão SSE autenticada por cookie pode permanecer aberta após uma mudança na participação] → Verificar a participação a cada entrega ou encerrar os fluxos quando a remoção da participação for processada, e testar que membros com acesso revogado não recebem eventos posteriores.
- [Um fluxo de eventos dentro do processo não distribui mensagens entre várias instâncias do backend] → Documentar a premissa de implantação em processo único e introduzir um intermediário compartilhado de mensagens antes de escalar horizontalmente.
- [Bancos existentes podem conter conversas `CASA` duplicadas] → Fazer a migração detectar duplicatas e interromper a execução sem modificar o histórico de mensagens, fornecendo os IDs conflitantes para uma decisão explícita de correção.
- [Um membro pode sair após receber um convite de reunião] → Manter os dados de respostas anteriores para o histórico, exigindo participação ativa em todas as leituras e escritas. Não permitir que um ex-membro responda.
- [Edições concorrentes de regras podem sobrescrever uma alteração recente] → Usar uma atualização atômica com validação da participação e atualizar a identificação do editor na mesma escrita. Considerar versionamento otimista somente se o comportamento de edição concorrente se tornar um requisito.

## Migration Plan

1. Inspecionar as conversas `CASA` existentes em busca de registros duplicados por residência antes de aplicar a migração opcional do índice único parcial. Se houver duplicatas, interromper a execução e preservar todos os dados de mensagens para resolução manual.
2. Aplicar a migração aditiva do índice único somente após as verificações de duplicidade passarem. Não é necessário reinicializar os dados nem substituir tabelas.
3. Implantar os módulos de backend antes das páginas de frontend e, em seguida, disponibilizar a interface usando os endpoints autenticados e o fluxo SSE.
4. Reverter a implantação removendo as rotas da interface e os módulos de backend. A reversão da migração remove somente o índice único parcial, sem excluir conversas ou mensagens.

As capacidades de regras e reuniões reutilizam as colunas e enumerações existentes. Se a inspeção do código durante a implementação identificar a necessidade de alterar o esquema, adicionar uma migração aditiva separada e documentar sua reversão na tarefa correspondente antes de aplicá-la.
