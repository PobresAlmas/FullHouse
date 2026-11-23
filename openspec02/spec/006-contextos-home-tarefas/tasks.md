# SPEC-006 — Tarefas

- [x] **T01 — Identificar o contexto dos atrasos.** Atualizar o texto da Home e os atalhos do modo Pessoal. **Refs:** RF01, CA01, CA03.
- [x] **T02 — Tornar a tarefa privada encontrável.** Aplicar a atribuição fixa ao criar, limpar filtros ao salvar e identificar tarefas privadas na lista. Autorizar a visualização pelo responsável atual de cada ocorrência. **Refs:** RF02, RNF01, CA02.
- [x] **T03 — Expor e preservar o modo Pessoal.** Integrar o acesso pela Home e pelo menu, manter a seleção na URL e ignorar respostas antigas. Incluir as tarefas da casa atribuídas à conta. **Refs:** RF03, RNF01–RNF02, CA03.
- [x] **T04 — Confirmar a tarefa final da troca.** Mostrar a prévia ao destinatário e gravar o aviso do solicitante na transação. **Refs:** RF04, RNF01–RNF02, CA04.
- [x] **T05 — Tornar o feedback visível.** Fixar a mensagem de ação na área visível. Focar o erro de validação no formulário. **Refs:** RF05, RNF03, CA05.
- [x] **T06 — Retestar no navegador.** Usar as contas A, B e C do cenário inicial. Conferir privacidade, recarga, sino e ações com teclado em tela estreita. Alternar Casa e Pessoal e verificar os avatares nos temas claro e escuro. **Refs:** CA01–CA05, RNF03.
- [x] **T07 — Padronizar o seletor e os avatares em Tarefas.** Manter a geometria do seletor entre os contextos e usar a foto ou a inicial sobre uma cor com contraste. **Refs:** RNF03.

## Verificação automatizada

As suítes focadas registraram 66 testes de frontend, 93 de backend e 17 de contrato HTTP aprovados. O teste de integração com PostgreSQL confirmou que a tarefa privada acompanha o responsável atual após a troca. As checagens TypeScript e ESLint passaram.

Comandos a partir da raiz do projeto no PowerShell.

```powershell
pnpm.cmd --dir web exec vitest run features/tasks features/home components/layout/__test__ components/ui/__test__/user-avatar.test.tsx
pnpm.cmd --dir backend exec vitest run src/tasks test/unit/tasks src/home
pnpm.cmd --dir backend run test:e2e test/home.e2e-spec.ts test/tasks.e2e-spec.ts test/personal-tasks.e2e-spec.ts test/task-exchange.e2e-spec.ts
```

Com `TEST_DATABASE_URL` apontando para o PostgreSQL de testes com as migrations aplicadas, executar o cenário da troca privada.

```powershell
pnpm.cmd --dir backend run test:integration:sprint02-migrations test/integration/task-exchange.integration.test.ts -t 'current assignee'
```

Na revisão da Sprint 03, passaram 66 testes web, 94 unitários, 17 HTTP e o cenário de integração da tarefa privada. O Chrome a 390 px confirmou a mudança de contexto, a recarga, o foco de erro por teclado, os avatares, a escolha final da troca, o aviso no sino e o acesso sem casa. Consulte os [comandos em Bash e o roteiro de evidências do Denilso](../../../docs/sprints/sprint03/Denilso/contextos-home-tarefas/testes.md).
