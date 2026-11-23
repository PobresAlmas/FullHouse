# SPEC-005 — Paginação da conversa de negociação

**Estado:** paginação e layout da conversa marcados como concluídos no registro original.
**Change de origem:** `paginate-room-negotiation-chat`.

## Objetivo

Carregar primeiro as mensagens recentes de uma negociação e permitir consultar o histórico anterior por páginas, mantendo a posição de leitura e a barra lateral visível no desktop.

## História de usuário

Como participante de uma negociação de quarto, quero consultar as mensagens mais antigas conforme preciso, para continuar lendo conversas longas sem perder minha posição.

**Referências do projeto:** [SPEC-004 — Negociação de quartos e convites](../004-negociacao-e-convites/requirements.md). Os identificadores RF, RNF e CA abaixo são locais à SPEC-005.

## Pré-condições

- Sessão autenticada e acesso autorizado à conversa de negociação.
- A consulta inicial usa o endpoint de mensagens da negociação. A próxima consulta usa o cursor da página carregada.

## Requisitos funcionais

- **RF01 — Página de mensagens recentes.** Retornar por padrão até 30 das mensagens mais recentes. Permitir tamanho de 1 a 50, devolver a página em ordem cronológica e informar se existe histórico anterior.
- **RF02 — Páginas anteriores.** Usar o identificador da mensagem mais antiga da página como cursor `before` quando houver mais dados. Uma nova consulta retorna mensagens estritamente anteriores a esse cursor.
- **RF03 — Carregar mais histórico.** Iniciar a conversa na mensagem mais recente. Carregar páginas anteriores ao aproximar-se do início da área de mensagens ou ao acionar o controle acessível. Inserir as mensagens anteriores acima das visíveis e preservar a posição de leitura.
- **RF04 — Rolagem e composição.** Manter a lista de mensagens em área delimitada com rolagem própria e o compositor fora dela. No desktop, a barra lateral permanece visível. Em telas menores, a página mantém navegação e envio utilizáveis.
- **RF05 — Atualização e falhas.** Preservar a atualização manual da página mais recente e a posição ao fim da lista após enviar uma mensagem. Impedir carregamentos simultâneos da mesma página e oferecer nova tentativa em caso de erro.

## Requisitos não funcionais

- **RNF01 — Ordenação estável.** Ordenar por data de envio e ID para evitar lacunas e duplicações, inclusive quando mensagens compartilham a data de envio ou quando chegam novas mensagens.
- **RNF02 — Autorização.** Manter a regra de acesso da negociação e rejeitar tamanho de página inválido, cursor malformado ou de outra conversa sem expor mensagens de terceiros.
- **RNF03 — Acessibilidade.** Manter um controle explícito de carregamento com teclado mesmo quando a primeira página não preenche a área visível.

## Regras de negócio

1. `limit` tem valor padrão 30, mínimo 1 e máximo 50.
2. A resposta inclui `hasMore` e `nextCursor`. O cursor é informado somente se restar uma página anterior.
3. O cursor precisa identificar uma mensagem da negociação autorizada. A consulta o exclui da página seguinte.
4. A paginação modifica somente a consulta e a interface da conversa de negociação. O armazenamento das mensagens mantém o modelo existente.

## Caso de uso — Ler mensagens anteriores

**Ator:** participante autenticado de uma negociação.

**Fluxo principal**

1. Abrir a conversa. A interface carrega as mensagens mais recentes e posiciona a leitura no fim.
2. Rolar em direção ao início da área de mensagens ou acionar o controle de carregar mensagens anteriores.
3. O sistema consulta o cursor atual, insere as mensagens em ordem cronológica e mantém a mensagem visível na mesma posição.
4. Repetir enquanto houver uma página anterior. O controle deixa de ser exibido no fim do histórico.

**Fluxos alternativos**

- **A1 — Erro de consulta.** Manter as mensagens já carregadas e oferecer nova tentativa.
- **A2 — Paginação inválida.** Rejeitar tamanho inválido ou cursor malformado ou externo à negociação.
- **A3 — Conta sem acesso.** Recusar a consulta conforme a autorização original, sem retornar dados da conversa.

## Critérios de aceitação

- **CA01 — Página inicial.** Sem cursor, retorna até 30 mensagens recentes em ordem cronológica. A tela inicia na mensagem mais recente.
- **CA02 — Próximas páginas.** Uma consulta anterior ao cursor retorna somente mensagens mais antigas, sem pular ou repetir mensagens de data igual. A última página não fornece outro cursor e a página vazia tem metadados coerentes.
- **CA03 — Segurança da consulta.** Parâmetros inválidos e cursores de outra negociação são rejeitados. Uma conta fora da conversa não recebe dados.
- **CA04 — Preservar leitura.** Rolagem próxima ao início e uso do controle explícito carregam a página anterior sem mover o trecho lido. Pedidos repetidos durante o carregamento não duplicam a consulta. Falha pode ser repetida.
- **CA05 — Desktop.** O histórico rola dentro da área de mensagens e mantém o compositor e a barra lateral visíveis.
- **CA06 — Celular.** É possível navegar, ler a lista e acessar o compositor em telas estreitas.
- **CA07 — Atualização da conversa.** Atualização manual obtém a página mais recente e o envio bem-sucedido mantém as mensagens novas acessíveis ao fim da lista.

## Fora do escopo

Paginação do chat da casa ou de subgrupos, mudanças nas notificações, atualização em tempo real, sondagem periódica, migração de banco ou mudança nas políticas de retenção.
