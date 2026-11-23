# SPEC-003 — Configurações da casa

**Estado:** implementação registrada em parte. Comparação visual, integrações de alertas, validações adicionais e verificação de tema constam como pendentes no checklist original.
**Change de origem:** `implement-house-settings`.

## Objetivo

Reunir a gestão da residência e as preferências do usuário em `/settings`, com navegação interna fiel ao protótipo e integração com os fluxos existentes de perfil, permissões, despensa e notificações.

## História de usuário

Como morador, quero consultar os dados da minha casa e ajustar minhas preferências. Como gestor, quero atualizar o nome da residência e controlar quem pode editar o conteúdo da casa.

**Referências do projeto:** RF023, RN001 e RN002 para autorização e isolamento, RF022 para categorias e RF017/RNF005 para a evolução de alertas. Consultar as [nove imagens de referência](../../../docs/design-references/design-references/settings/README.md). Os identificadores RF, RNF e CA abaixo são locais à SPEC-003.

## Pré-condições

- Sessão autenticada. As ações residenciais exigem participação ativa na casa.
- Alterar o nome, a política global ou o acesso de um morador exige o papel `LIDER` ou `ADMINISTRADOR`.
- O cadastro pessoal já está disponível em `/profile` e o domínio de categorias da despensa já oferece sua API.

## Requisitos funcionais

- **RF01 — Configurações e perfil.** Expor `/settings` com navegação para Minha conta, Casa, Moradores, Permissões, Notificações e Preferências. Minha conta leva a `/profile`. Sem residência, mostrar um estado vazio com uma ação de saída adequada.
- **RF02 — Navegação por URL.** Representar seção e aba na URL por `section` e `tab`, preservando a seleção em recarregamentos e normalizando parâmetros inválidos.
- **RF03 — Dados da casa.** Mostrar o nome e os dados disponíveis da residência ativa. Permitir que gestores salvem um nome válido de até 80 caracteres após remover espaços externos e atualizar a navegação global.
- **RF04 — Moradores.** Listar os moradores ativos da casa, com nome, papel e contato público quando autorizado. Tratar lista vazia e omitir dados sensíveis.
- **RF05 — Política global.** Exibir as opções reais `TODOS` e `LIDERES` e permitir alteração persistida por gestor. Moradores podem consultar a configuração.
- **RF06 — Acesso individual e remoção.** Distinguir as funções de gestão da permissão efetiva de conteúdo. Permitir que gestores definam **Pode editar**, **Somente leitura** ou herança da política global para moradores. A remoção encerra um vínculo elegível e preserva o histórico.
- **RF07 — Categorias.** Oferecer as abas Geral, Categorias, Despensa, Financeiro e Pets. Listar, criar, renomear e remover categorias pela API existente. Orientar a reclassificação se a categoria ainda tiver itens.
- **RF08 — Preferências pessoais.** Consultar e persistir preferências por usuário e residência, incluindo opções de alertas, Despensa, Financeiro e Pets. Alterações parciais preservam os campos omitidos.
- **RF09 — Preferências aplicadas.** Respeitar as opções de exibição de vencidos e atrasadas nas listas correspondentes. Guardar a configuração de lembretes de tarefas, despesas, convites, atualizações da casa, vacinas, vermífugo e consultas. Vincular promessas de envio à geração e ao transporte efetivos dos eventos.
- **RF10 — Centro de notificações.** Listar avisos persistidos com paginação e filtro geral/não lidas. Permitir marcar como lida, manter a contagem do sino coerente e atualizar a seção pela API autenticada.
- **RF11 — Tema.** Aplicar Claro, Escuro e Sistema ao aplicativo, persistir a escolha no dispositivo e acompanhar as mudanças do sistema operacional no modo Sistema. A liberação depende de suporte visual completo.
- **RF12 — Matriz de permissões de G05.** Aplicar na API e na interface as permissões da tabela abaixo para lista de compras, categorias da despensa, mural e pets.

## Matriz de permissões de G05

Gestores são `LIDER` e `ADMINISTRADOR` com vínculo ativo. Para `MORADOR`, **Pode editar** (`true`) e **Somente leitura** (`false`) sobrescrevem a política global. **Herdar política da casa** (`null`) permite edição em `TODOS` e deixa o morador somente leitura em `LIDERES`. A autoria do registro não muda essas permissões.

| Operação                                                                                | Gestor | Morador com edição, autor ou outro | Morador somente leitura | Sem vínculo ativo na casa |
| --------------------------------------------------------------------------------------- | ------ | ---------------------------------- | ----------------------- | ------------------------- |
| Consultar lista, categorias, mural e pets                                               | Sim    | Sim                                | Sim                     | Sem acesso                |
| Adicionar, editar, marcar como comprado, reabrir ou remover item da lista compartilhada | Sim    | Sim                                | Não                     | Sem acesso                |
| Criar ou renomear categoria da despensa                                                 | Sim    | Sim                                | Não                     | Sem acesso                |
| Remover categoria sem itens associados                                                  | Sim    | Sim                                | Não                     | Sem acesso                |
| Criar ou editar regra do mural                                                          | Sim    | Não                                | Não                     | Sem acesso                |
| Criar ou editar pet e registro de cuidado                                               | Sim    | Sim                                | Não                     | Sem acesso                |
| Remover pet ou registro de cuidado                                                      | Sim    | Não                                | Não                     | Sem acesso                |

Categoria com itens associados fica protegida em todos os papéis. Alterações e remoções da lista continuam exigindo a versão atual do item. A revisão G05 mantém a exclusão de pets restrita a gestores, inclusive quando um morador é o autor do cadastro.

## Requisitos não funcionais

- **RNF01 — Fidelidade visual.** Reutilizar o cabeçalho e a barra lateral, preservar hierarquia, cartões, fundos claros e seleção lavanda conforme as referências, apresentando dados reais.
- **RNF02 — Acessibilidade e responsividade.** Fornecer rótulos, foco visível, feedback de estados e navegação por teclado em abas e menus. A tela estreita deve permanecer utilizável sem corte horizontal.
- **RNF03 — Controle de acesso.** Validar alterações e escopo no servidor, mesmo quando a interface restringe ações. Filtrar notificações pela conta autenticada e impedir exposição de dados entre casas.

## Regras de negócio

1. Cada conta possui no máximo uma participação ativa. Servidor e banco impedem que criação de casa ou aceite de convite gerem uma segunda participação ativa e preservam o histórico de vínculos encerrados.
2. A permissão individual `canEditContent` admite `true`, `false` e `null` para herdar a política global. Papéis de gestão têm tratamento próprio. Só disponibilizar o ajuste individual quando as operações de conteúdo aplicarem a autorização efetiva.
3. A remoção é restrita a membros elegíveis. O líder e o próprio gestor que executa a ação ficam protegidos. Transferência ou rebaixamento de gestores não faz parte do seletor.
4. Antecedências de aviso aceitam 1, 3, 5, 7 ou 14 dias. Rejeitar campos desconhecidos e valores inválidos sem salvar parte da alteração.
5. A fase 1 abrange navegação, leitura de Casa/Moradores, política global, categorias, notificações existentes paginadas e vínculo ativo único. A fase 2 depende de suporte real a edição da casa, preferências, gestão individual, centro de notificações e temas.

## Caso de uso — Ajustar configurações e preferências

**Ator:** morador autenticado, com papel de gestão quando a ação exigir.

**Fluxo principal**

1. Abrir Configurações e selecionar uma seção. A URL acompanha a seleção.
2. Conferir os dados de Casa e Moradores. Quando autorizado, salvar o nome ou alterar a política e as permissões individuais elegíveis.
3. Abrir Preferências, mudar os campos desejados e salvar. Consultar a seção Notificações e marcar avisos como lidos.
4. Recarregar a seção para conferir a persistência dos valores e da navegação.

**Fluxos alternativos**

- **A1 — Sessão ou vínculo ausente.** A proteção bloqueia a sessão ausente. Para uma conta autenticada sem casa, oferecer estado vazio sem requisitar dados com identificador indefinido.
- **A2 — Dados inválidos ou acesso insuficiente.** Apresentar o erro da API sem gravar parcialmente ou exibir dados de outra casa.
- **A3 — Categoria em uso.** Preservar a categoria e orientar a reclassificação dos itens.
- **A4 — Alerta ou tema sem suporte.** Indicar indisponibilidade do alerta sem integração efetiva. Manter a opção de tema incompleto fora da entrega funcional.

## Critérios de aceitação

- **CA01 — Acesso e vínculo único.** A seção Casa abre para a conta autenticada com residência, com navegação e dados reais. Conta sem casa vê estado vazio. Conta sem sessão fica bloqueada. Uma segunda participação ativa é rejeitada.
- **CA02 — Roteamento.** Minha conta usa `/profile`. Selecionar Preferências → Despensa reflete a URL e sobrevive à recarga. Query inválida volta a uma seleção válida.
- **CA03 — Nome da casa.** Gestor salva um nome válido e o vê na seção e na barra lateral. Nome vazio, acima do limite ou mudança por não gestor não altera o registro.
- **CA04 — Moradores.** A lista contém apenas membros ativos da casa atual. Consulta sem vínculo retorna acesso negado ou `404`, sem dados de moradores.
- **CA05 — Política global.** Gestor altera a política, recebe confirmação e vê o valor após recarregar. Morador comum pode consultar, mas a API rejeita sua tentativa de alteração.
- **CA06 — Permissões individuais.** LÍDER/ADMINISTRADOR aparecem como função de gestão. Revogar edição de um morador muda o estado para Somente leitura e a API passa a negar as operações de criação e edição afetadas. Remoção elegível encerra o vínculo e preserva o histórico.
- **CA07 — Categorias.** Criar uma categoria válida e única a inclui na lista. Exclusão de categoria em uso informa a dependência. Alteração em outra casa não modifica seus dados.
- **CA08 — Persistência e validação.** Um PATCH de `expirationNoticeDays` de 5 para 7 mantém os demais campos e o resultado aparece em consulta posterior. Erros de validação não gravam alterações. Dois moradores não sobrescrevem as preferências um do outro.
- **CA09 — Exibição e alertas.** `showExpired=false` oculta os itens vencidos sem excluí-los. `showOverdue=true` mantém despesas atrasadas visíveis conforme permissões. Preferências de Pets persistem após novo login. Avisos efetivos respeitam as preferências do destinatário.
- **CA10 — Centro de notificações.** Uma conta com 25 avisos consegue navegar por todos. O filtro e a marcação persistida atualizam a contagem. Uma conta não lê avisos alheios. A atualização periódica exibe os avisos já produzidos.
- **CA11 — Tema.** Sistema acompanha o tema do sistema operacional. Escuro persiste após recarregar, com contraste e sem flash indevido. Uma opção sem adaptação visual completa não é declarada concluída.
- **CA12 — Interface.** Desktop e celular preservam a navegação, a hierarquia e o acesso aos controles. A comparação das nove telas documenta diferenças intencionais.
- **CA13 — Matriz de G05.** Confirmar os controles da interface e as respostas da API nas operações de RF12 para gestor, autor, outro morador, somente leitura e conta sem vínculo. Alterar entre `TODOS` e `LIDERES` com e sem permissão individual. Conferir o conflito de versão da lista e a proteção da categoria em uso.

## Fora do escopo

Reescrever autenticação, tarefas, despesas, despensa ou perfil. Recriar APIs de categorias, implementar chat, calendário, fundo de reserva, transferência de gestão ou canais externos de notificação.
