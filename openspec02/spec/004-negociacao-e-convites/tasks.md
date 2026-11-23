# SPEC-004 — Tarefas

Use este checklist como pedido de implementação. Consulte [requirements.md](requirements.md) e [design.md](design.md) antes de começar. Os estados foram preservados da change de origem.

## Persistência da negociação

- [x] **T01 — Persistir negociação e mensagens.** Criar os modelos de conversa privada e mensagens ligados a um único interesse e a relação do convite. Preservar as conversas de casa e subgrupo e verificar geração do Prisma e migração com interesses antigos. **Refs:** RF02–RF05, RNF01–RNF02, CA01, CA03–CA06.

## Decisão de interesse e mensagens privadas

- [x] **T02 — Processar decisão de interesse.** Aceitar e criar ou recuperar a conversa em uma transação, notificando a pessoa interessada. Cobrir aceite, recusa, idempotência e reversão de falha nos testes do serviço. **Refs:** RF02, RF06, RNF02, CA01–CA02, CA07.
- [x] **T03 — Listar interesses próprios.** Criar a consulta autenticada com estados e negociações aceitas. Verificar que o resultado pertence apenas à pessoa da sessão. **Refs:** RF01, RNF01, CA02.
- [x] **T04 — Proteger operações de mensagem.** Criar leitura e envio autenticados. Verificar mensagens entre os participantes e respostas de acesso negado ou inexistente para terceiros. **Refs:** RF03, RNF01, CA03–CA04.
- [x] **T05 — Documentar interesse e mensagens.** Documentar os contratos no README do módulo de Quartos e conferir os payloads nos testes de controller e DTO. **Refs:** RF01–RF03, CA01–CA04.

## Ciclo do convite

- [x] **T06 — Enviar convite direcionado.** Restringir o envio ao anunciante gestor e vincular à pessoa interessada daquela conversa. Testar tentativas de não gestores ou usuários externos. **Refs:** RF04, RF06, RNF01, CA05.
- [x] **T07 — Responder convite em transação.** Autorizar somente o destinatário. Aceitar ativa a participação e registra a decisão juntos. Recusar preserva vínculo e conversa. Testar ambas as decisões e respostas concorrentes. **Refs:** RF05, RNF02, CA04, CA06.
- [x] **T08 — Documentar e testar convites.** Registrar o contrato da API e cobrir no E2E a autorização, participação após aceite, recusa e continuidade da conversa. **Refs:** RF04–RF05, RNF01–RNF02, CA04–CA06.

## API de notificações persistidas

- [x] **T09 — Listar e marcar notificações.** Adicionar consulta e marcação autenticadas com links de interesse aceito e ações de convite pendente. Verificar que terceiros não leem nem respondem pelo destinatário. **Refs:** RF06, RNF01, CA07–CA09.
- [x] **T10 — Conferir persistência de avisos.** Cobrir a gravação e as ações em testes de serviço e repositório. Documentar o contrato da resposta. **Refs:** RF06, CA07–CA09.

## Interface de interessados e anunciantes

- [x] **T11 — Exibir Meus interesses.** Mostrar estados pendente, aceito e recusado, com link quando a negociação estiver disponível. Cobrir esses estados na interface. **Refs:** RF01–RF02, CA01–CA02.
- [x] **T12 — Abrir conversa e convite.** Implementar a interface privada para ambos, com envio de convite limitado aos gestores. Verificar que a conversa permanece aberta após recusa ou aceite. **Refs:** RF03–RF05, RNF01, CA03–CA06.
- [x] **T13 — Exibir ações no sino.** Mostrar avisos reais no cabeçalho e ações de aceitar ou recusar apenas para convites pendentes. Remover ações já tratadas. **Refs:** RF06, CA07–CA09.

## Verificação integrada

- [x] **T14 — Executar suítes de negociação.** Executar os testes unitários e HTTP do backend e os testes de frontend de interesses, negociação, convites, avisos e acesso. Corrigir regressões. **Refs:** RNF01–RNF02, CA01–CA09.
- [x] **T15 — Verificar builds e integração.** Executar builds do backend e frontend e validação estrita do OpenSpec original. Conferir que o vínculo mantém a negociação privada e preserva o chat da casa. **Refs:** RNF01–RNF02, CA01–CA09.

## Verificação registrada

O checklist de origem registra como concluídos os testes focados de backend, HTTP e frontend, os builds e a validação estrita da change. Os contratos podem ser consultados no [README de Quartos](../../../backend/src/rooms/README.md) e a migração tem [suíte própria](../../../backend/test/integration/room-negotiations-migration.integration.test.ts).
