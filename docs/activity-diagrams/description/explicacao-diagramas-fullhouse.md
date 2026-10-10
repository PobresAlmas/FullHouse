# Explicação dos Diagramas de Atividades — FullHouse

Este documento apresenta uma descrição sucinta dos diagramas de atividades do sistema **FullHouse**. O objetivo é registrar, de forma clara, o fluxo principal de cada funcionalidade, destacando as ações do usuário, as validações realizadas pelo sistema e os possíveis caminhos alternativos.

## 1. Entrada em uma residência

Este diagrama representa o processo executado quando o usuário acessa o sistema e é verificado se ele já está associado a uma residência. Caso exista uma associação, o sistema consulta suas permissões e apresenta o painel adequado, diferenciando usuários administradores dos demais moradores.

Se o usuário ainda não estiver associado a uma residência, ele poderá verificar convites recebidos ou criar uma nova casa. Ao aceitar um convite, passa a integrar a residência como morador; ao criar uma nova residência, é registrado como administrador. Ao final, o sistema retorna ao fluxo principal já com a residência associada.

## 2. Financeiro

O diagrama do módulo financeiro descreve o fluxo de consulta e gerenciamento das despesas da residência. Ao acessar a área, o usuário pode alternar entre a visão geral da casa e sua visão individual, enquanto o sistema busca os dados correspondentes e calcula informações como total a pagar, total pago e média mensal.

A partir da listagem de despesas, também é possível adicionar uma nova despesa, criar subgrupos ou selecionar uma despesa existente. Uma despesa selecionada pode ser marcada como paga, editada ou excluída. Sempre que necessário, o sistema valida os dados e atualiza a lista e o calendário financeiro.

## 3. Adição de despesa

Este fluxo detalha o cadastro de uma nova despesa. Inicialmente, o sistema carrega as categorias disponíveis e os moradores da residência. Em seguida, o usuário informa os dados da despesa, como categoria, valor e vencimento.

Quando a despesa é relacionada à casa, também são definidos os participantes envolvidos. Após a confirmação, o sistema valida as informações. Caso algum dado seja inválido, o usuário recebe uma mensagem de erro e pode realizar as correções. Com os dados válidos, a despesa é cadastrada e as informações financeiras, a lista e o calendário são atualizados.

## 4. Adição de subgrupo financeiro

O diagrama apresenta o processo de criação de um subgrupo dentro do módulo financeiro. O sistema busca os participantes disponíveis e o usuário informa os dados do novo subgrupo, selecionando quem fará parte dele.

Depois da confirmação, os dados são validados. Caso existam informações inválidas, o sistema exibe um erro e permite a correção. Quando a validação é concluída com sucesso, o subgrupo é criado e passa a aparecer entre as opções financeiras disponíveis.

## 5. Recuperação de senha

Este diagrama descreve todo o processo de recuperação de acesso. O usuário informa seu e-mail e solicita o envio de um código de recuperação. O sistema verifica se o endereço é válido e se está associado a uma conta antes de gerar e enviar o código.

O usuário pode solicitar um novo código, caso necessário. Após informar o código recebido, o sistema realiza a validação. Se estiver correto, o usuário define uma nova senha e sua confirmação. As senhas são comparadas e, quando coincidem, a alteração é registrada. Ao final, o sistema apresenta uma confirmação de sucesso e redireciona o usuário para a tela de login.

## 6. Saída de uma residência

O fluxo de saída de uma residência começa quando o usuário acessa as informações da casa por meio do perfil e seleciona a opção de sair. Antes de efetivar a operação, o sistema apresenta uma confirmação.

Caso o usuário cancele, ele permanece normalmente na residência. Se confirmar, o sistema remove sua associação com a casa, exclui suas permissões, atualiza a lista de membros e retorna o usuário para a tela inicial sem uma residência vinculada.

## 7. Login

O diagrama de login representa o processo de autenticação do usuário. Após informar e-mail e senha, o usuário também pode optar por visualizar a senha digitada. Em seguida, o sistema valida os campos e as credenciais fornecidas.

Quando as informações são válidas, o sistema define o tempo de expiração da sessão de acordo com a opção “lembrar de mim”, gera o token de autenticação e envia a credencial ao navegador para armazenamento. Depois disso, os dados da residência são carregados e a página inicial é exibida. Em caso de erro, o usuário recebe uma mensagem e pode corrigir os dados.

## 8. Notificações

Este diagrama representa a consulta e o gerenciamento das notificações do sistema. Ao clicar no ícone correspondente, o usuário visualiza um popup com suas notificações e pode marcá-las como lidas ou interagir com convites para residências.

No caso de um convite, é possível aceitá-lo ou rejeitá-lo. Ao aceitar, o sistema associa o usuário à residência e define sua permissão como morador; ao rejeitar, a notificação é removida. O usuário também pode acessar o histórico completo de notificações pelo perfil e alternar entre a visão geral e as notificações ainda não lidas.

## 9. Despensa

O diagrama da despensa apresenta as principais operações relacionadas ao controle de itens da casa. Ao acessar o módulo, o sistema carrega os itens e categorias cadastrados e exibe o painel da despensa.

O usuário pode adicionar novos itens, alterar quantidades, editar informações ou excluir registros existentes. Também pode definir uma quantidade mínima para cada item. Quando o estoque fica abaixo desse valor, o sistema gera um alerta de estoque baixo. Todas as operações que modificam dados passam por validação e, após sua conclusão, a lista da despensa é atualizada.

## 10. Permissões dos moradores

Este diagrama mostra como um administrador pode alterar o nível de acesso dos moradores da residência. A partir da seção de permissões no perfil, o sistema carrega os moradores e suas permissões atuais.

O administrador seleciona um morador e escolhe o tipo de acesso desejado, como administrador, permissão de edição ou somente leitura. Após a escolha, o sistema registra a alteração e atualiza o perfil de acesso do morador. O processo pode ser repetido para outros membros ou encerrado.

## 11. Gestão de pets

O diagrama de gestão de pets reúne as principais operações relacionadas aos animais da residência. Ao acessar a seção de pets, o sistema consulta os registros existentes e apresenta as opções disponíveis para cada animal.

O morador pode visualizar detalhes, cadastrar um novo pet, editar seus dados, excluir um cadastro ou registrar cuidados e gastos, como vacinas, ração e despesas veterinárias. Cada operação possui suas próprias validações e mensagens de confirmação ou erro. Ao final das alterações, a listagem de pets é atualizada para refletir os dados mais recentes.

## 12. Cadastro de usuário

O fluxo de cadastro começa com o preenchimento de nome, apelido, e-mail e senha. Assim como no login, o usuário pode optar por visualizar a senha enquanto preenche os dados.

O sistema valida os campos e verifica se o e-mail informado já está cadastrado. Se houver algum problema, uma mensagem de erro é exibida para que os dados sejam corrigidos. Caso as informações sejam válidas e o e-mail esteja disponível, o cadastro é concluído e o usuário é direcionado para a tela de login.

## 13. Gerenciamento de moradores

Este diagrama descreve o gerenciamento dos membros de uma residência. Ao acessar a seção de moradores pelo perfil, o usuário visualiza a lista atual de integrantes da casa.

A partir dessa tela, é possível convidar ou adicionar um novo morador, editar os dados de um membro existente ou removê-lo. Durante a edição, informações como nome, e-mail e permissão podem ser alteradas. O sistema valida as mudanças antes de salvá-las e atualiza a lista de moradores após cada operação concluída.

## 14. Troca de tarefas

O fluxo de troca de tarefas permite que um morador solicite a outro a troca de responsabilidades. O usuário seleciona a tarefa, escolhe o outro morador e indica a tarefa desejada para a troca.

O sistema valida a solicitação e, quando ela é válida, cria o pedido e notifica o outro morador. O destinatário pode aceitar ou recusar. Em caso de aceite, os responsáveis pelas tarefas são trocados e a lista é atualizada. Em caso de recusa, a solicitação é removida. Nos dois casos, o solicitante é notificado sobre o resultado.

## 15. Tarefas

O diagrama do módulo de tarefas descreve tanto a criação quanto o gerenciamento das tarefas da residência. Ao entrar no módulo, o sistema busca as tarefas, categorias e solicitações de troca antes de exibir o painel principal.

O usuário pode criar uma nova tarefa informando título, descrição opcional, tags, responsável, data e horário. Também pode definir repetição e lembretes. O sistema valida os dados antes de cadastrar a tarefa e, quando necessário, registra a recorrência e agenda o lembrete.

Além da criação, o usuário pode filtrar tarefas e interagir com registros existentes, marcando-os como concluídos, editando-os ou excluindo-os. Após cada alteração, o sistema atualiza os indicadores e a lista de tarefas para manter as informações exibidas consistentes.
