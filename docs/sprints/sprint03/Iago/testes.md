# Sprint 03 — Testes de colaboração da casa

**Responsável:** Iago  
**Módulos:** Chat, regras da casa e reuniões

## 1. Escopo

Este documento registra a execução dos testes unitários das novas implementações de chat, mural de regras e reuniões. Os testes unitários usam dependências simuladas e não substituem os testes HTTP/E2E nem os testes de integração com banco de dados.

## 2. Suítes unitárias

| Módulo         | Arquivos cobertos                | Principais cenários                                                                                    | Evidência            |
| -------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------- |
| Chat           | `backend/test/unit/chat/`        | Histórico, autorização por residência, autoria, validação de conteúdo, mensagens e stream SSE.         | `Chat/image.png`     |
| Reuniões       | `backend/test/unit/meetings/`    | Agendamento, convites, respostas, permissões, reagendamento, cancelamento e persistência transacional. | `Reuniões/image.png` |
| Regras da casa | `backend/test/unit/house-rules/` | Regras vigentes, criação e edição, autoria e acesso à residência.                                      | `Regras/image.png`   |

## 3. Comandos

Execute cada suíte a partir de `backend/`, para gerar uma saída individual que possa ser registrada em captura de tela.

### Chat

```bash
pnpm exec vitest run test/unit/chat --reporter=verbose
```

### Reuniões

```bash
pnpm exec vitest run test/unit/meetings --reporter=verbose
```

### Regras da casa

```bash
pnpm exec vitest run test/unit/house-rules --reporter=verbose
```

## 4. Testes complementares

Os comandos acima executam somente testes unitários. Os testes HTTP/E2E e de integração são separados e podem ser executados, respectivamente, com:

```bash
pnpm exec vitest run --config ./vitest.config.e2e.ts test/chat.e2e-spec.ts test/house-rules.e2e-spec.ts test/meetings.e2e-spec.ts
```

```bash
pnpm exec vitest run --config ./vitest.config.integration.ts test/integration/house-conversation-migration.integration.test.ts
```

O teste de integração requer `TEST_DATABASE_URL` apontando para um PostgreSQL de teste.

## 5. Resultados registrados

Na execução conjunta das suítes unitárias de chat, regras e reuniões foram registrados **7 arquivos e 25 testes aprovados**. As capturas individuais por módulo estão nos caminhos indicados na tabela da seção 2.

Os testes E2E registrados para os três módulos somaram **3 arquivos e 10 testes aprovados**. A suíte de integração da migration não foi considerada nessa contagem.
