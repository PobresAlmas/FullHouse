# Delta specification — settings-preferences

## ADDED Requirements

### Requirement: Navegar pelas abas de Preferências

O sistema SHALL oferecer `Geral`, `Categorias`, `Despensa`, `Financeiro` e `Pets`, seguindo a hierarquia e os estilos do protótipo.

#### Scenario: Alternar aba

- **WHEN** o usuário seleciona uma aba
- **THEN** o conteúdo correspondente aparece e a URL reflete a seleção

### Requirement: Administrar categorias da despensa

O sistema SHALL usar as APIs existentes para listar, criar, renomear e remover categorias, sem duplicar o domínio.

#### Scenario: Criar categoria

- **GIVEN** usuário autorizado pela política de edição da casa
- **WHEN** informa nome válido que não existe na residência
- **THEN** a categoria é criada e imediatamente aparece na lista

#### Scenario: Remover categoria associada a itens

- **WHEN** tenta excluir categoria que tem itens
- **THEN** a operação é recusada com mensagem orientando a reclassificação

#### Scenario: Usuário de outra residência

- **WHEN** tenta alterar categoria de residência da qual não participa
- **THEN** o backend não modifica os dados

### Requirement: Persistir preferências por usuário e residência

O sistema SHALL ler e salvar preferências pessoais de alertas e exibição, isoladas pelo usuário autenticado e pela residência, mantendo valores após recarregamento. Payloads PATCH SHALL modificar apenas campos enviados.

#### Scenario: Salvar antecipação de validade

- **WHEN** o usuário muda `expirationNoticeDays` de 5 para 7 e salva
- **THEN** GET posterior devolve 7 e demais campos permanecem intactos

#### Scenario: Campo inválido

- **WHEN** é enviado prazo fora do conjunto 1, 3, 5, 7, 14 ou chave desconhecida
- **THEN** a API rejeita o pedido com erro de validação e não persiste valores parciais

#### Scenario: Isolamento entre usuários

- **WHEN** dois usuários da mesma residência alteram preferências pessoais
- **THEN** as preferências de um não sobrescrevem as do outro

### Requirement: Preferências de notificações não devem prometer envio inexistente

O sistema SHALL armazenar as opções `newTasks`, `newExpenses`, `upcomingDueDates`, `residentInvitations`, `houseUpdates`, mas SHALL ativar a promessa de envio apenas quando o gerador e o transporte estiverem efetivos.

#### Scenario: Canal de notificação ainda não implementado

- **WHEN** o usuário visita uma opção cujo evento ainda não é produzido pelo backend
- **THEN** o controle fica indisponível com explicação explícita, ou não é liberado para produção

#### Scenario: Notificação implementada

- **GIVEN** evento gerado e preferência habilitada
- **WHEN** ocorre a condição relevante
- **THEN** o aviso é criado para o usuário autorizado conforme a preferência

### Requirement: Preferências de Despensa e Financeiro

O sistema SHALL oferecer antecedências em dias e opções de exibir itens vencidos e despesas atrasadas; as preferências de exibição deverão afetar efetivamente as listas correspondentes.

#### Scenario: Filtrar vencidos

- **WHEN** `showExpired=false` é salvo
- **THEN** a lista da despensa deixa de exibir itens vencidos no contexto do usuário, sem excluir registros do banco

#### Scenario: Exibir atrasadas

- **WHEN** `showOverdue=true` é salvo
- **THEN** despesas vencidas permanecem visíveis, obedecendo outras permissões do módulo

### Requirement: Preferências de Pets

O sistema SHALL oferecer opções de lembrete de vacinas, vermífugo e consultas. O sistema não SHALL alegar que alertas são enviados quando o calendário/cuidados de pet ainda não fornecem os eventos necessários.

#### Scenario: Preferência persistida

- **WHEN** usuário desativa lembretes de vacinas e salva
- **THEN** a opção permanece desativada após logout/login

### Requirement: Centro de notificações completo

O sistema SHALL paginar notificações próprias, permitir diferenciar lidas/não lidas e preservar a marcação como lida no backend; a contagem global deverá continuar coerente com o sino.

#### Scenario: Paginação

- **GIVEN** existem 25 notificações
- **WHEN** o usuário abre o centro
- **THEN** consegue percorrer todos os itens, sem limitar permanentemente a quatro

#### Scenario: Isolamento

- **WHEN** usuário tenta ler notificação de outra conta
- **THEN** API impede o acesso

### Requirement: Seleção de tema funcional

O sistema SHALL aplicar `Claro`, `Escuro`, `Sistema` à aplicação inteira e persistir a escolha no dispositivo, sem simplesmente trocar um botão visual.

#### Scenario: Sistema muda de tema

- **GIVEN** opção `Sistema` selecionada
- **WHEN** preferências do sistema operacional mudam
- **THEN** a interface acompanha a alteração

#### Scenario: Tema persiste

- **WHEN** o usuário seleciona `Escuro` e atualiza a página
- **THEN** as páginas privadas preservam o tema com contraste e sem flash de tema indevido

#### Scenario: Suporte de tema ainda incompleto

- **WHEN** páginas existentes não foram adaptadas ao tema escuro
- **THEN** a opção não é lançada como concluída
