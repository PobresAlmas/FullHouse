# Sprint 02 — Testes de colaboração da casa

**Responsável:** Iago  
**Módulos:** Chat, regras da casa e reuniões

## 1. Escopo

Foram adicionados testes unitários para autorização, autoria, isolamento, filtros, convites, transações, reagendamento e cancelamento; testes HTTP para autenticação e validação; testes web para listagem, cadastro, edição, conexão ao vivo e respostas.

## 2. Arquivos de teste

| Arquivo                                                                     | Cobertura                                                                                  |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `backend/test/unit/chat/chat.service.spec.ts`                               | Histórico, participação ativa, autoria, conteúdo e isolamento do stream por conversa.      |
| `backend/test/unit/chat/chat.repository.spec.ts`                            | Ordem cronológica e recuperação de mensagens após cursor.                                  |
| `backend/test/unit/chat/chat.controller.spec.ts`                            | Autorização do SSE e encerramento após revogação da participação.                          |
| `backend/test/integration/house-conversation-migration.integration.test.ts` | Índice parcial e falha segura preservando mensagens antigas.                               |
| `backend/test/chat.e2e-spec.ts`                                             | Autenticação, conteúdo inválido, envio e stream HTTP.                                      |
| `backend/test/unit/house-rules/` e `backend/test/house-rules.e2e-spec.ts`   | Filtro de regras vigentes, autoria, edição, acesso e validação HTTP.                       |
| `backend/test/unit/meetings/` e `backend/test/meetings.e2e-spec.ts`         | Convites transacionais, respostas, rollback, reagendamento, cancelamento e contratos HTTP. |
| `web/features/house-collaboration/api/__tests__/collaboration.api.test.ts`  | Contratos dos clientes HTTP e SSE.                                                         |
| `web/app/(private)/{chat,rules,meetings}/__test__/page.test.tsx`            | Fluxos de tela, formulário, reconexão, residência, respostas e histórico.                  |

## 3. Comandos

Na raiz do repositório, os testes unitários dos módulos de colaboração:

```bash
cd backend
pnpm exec vitest run --maxWorkers=1 test/unit/chat test/unit/house-rules test/unit/meetings
```

Os testes HTTP/E2E dos três módulos (a execução precisa abrir servidor HTTP local):

```bash
cd backend
pnpm exec vitest run --config ./vitest.config.e2e.ts test/chat.e2e-spec.ts test/house-rules.e2e-spec.ts test/meetings.e2e-spec.ts
```

Teste de migration, com `TEST_DATABASE_URL` apontando para um PostgreSQL de teste:

```bash
cd backend
pnpm exec vitest run --config ./vitest.config.integration.ts test/integration/house-conversation-migration.integration.test.ts
```

Build do backend:

```bash
cd backend
pnpm exec prisma generate
pnpm build
```

Testes, tipos e build web:

```bash
cd web
pnpm test -- --maxWorkers=1 --testTimeout=15000
pnpm exec tsc --noEmit
pnpm exec next build --webpack
```

## 4. Resultados da verificação

Executados nesta implementação:

- Testes unitários backend de chat, regras e reuniões: **7 arquivos, 25 testes aprovados**.
- Testes HTTP/E2E de chat, regras e reuniões: **3 arquivos, 10 testes aprovados**.
- Testes web completos: **60 arquivos, 189 testes aprovados**.
- `pnpm exec tsc --noEmit` no web: aprovado.
- Build Nest (`pnpm build`): aprovado após gerar o Prisma Client.
- Build Next.js (`pnpm exec next build --webpack`): compilação, checagem TypeScript e geração de páginas aprovadas.
- ESLint nos arquivos backend alterados: aprovado.
- Prettier nos arquivos backend, OpenSpec e Sprint 2 alterados: aprovado.
- `openspec validate implement-house-collaboration --strict` e `git diff --check`: aprovados.

A suíte de integração da migration foi iniciada, mas seus **2 cenários foram pulados** porque `TEST_DATABASE_URL` não está definida no ambiente. A migration e os cenários estão implementados; a confirmação contra PostgreSQL depende dessa variável e de um banco de teste.

O build padrão do Next com Turbopack foi impedido pelo sandbox ao tentar abrir socket local. O build com webpack foi executado com permissão de rede/socket e terminou com sucesso.

## 5. Limites

O fan-out SSE usa memória local e pressupõe uma instância do backend; múltiplas instâncias exigirão broker compartilhado. A remoção de acesso é verificada no stream em intervalos de 15 segundos. A migration precisa ser aplicada em PostgreSQL e requer resolução manual de possíveis duplicatas apontadas por ela.
