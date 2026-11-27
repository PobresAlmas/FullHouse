# Sprint 02 — Implementação da lista de compras

**Responsável:** Calebe Mesquita<br>
**Módulo principal:** Lista de compras compartilhada<br>
**Capacidade OpenSpec:** `shopping-list`

## 1. Visão geral

A lista é compartilhada por residência e composta por itens associados diretamente à casa. A interface Next.js consome rotas NestJS protegidas por JWT. O serviço valida a participação ativa em todas as operações; a persistência usa Prisma e PostgreSQL.

O código da funcionalidade e as suítes automatizadas estão implementados. As verificações com dados reais e as evidências manuais descritas nas tarefas OpenSpec ainda não foram registradas.

## 2. Frontend

| Recurso | Arquivo principal | Papel |
| --- | --- | --- |
| Página da lista | `web/app/(private)/shopping-list/page.tsx` | Seleção de residência, inclusão/edição, seções de pendentes/comprados e ações do item. |
| Cliente HTTP e tipos | `web/features/shopping-list/api/shopping-list.api.ts` | Contratos e chamadas à API residencial. |
| Testes da página | `web/app/(private)/shopping-list/__test__/page.test.tsx` | Fluxos, duplicatas, validação, concorrência, troca de residência e estados de tela. |
| Testes do cliente | `web/features/shopping-list/api/__test__/shopping-list.api.test.ts` | Rotas, payloads e versão enviada nas operações. |
| Navegação | `web/components/layout/AppSidebar.tsx` | Adiciona o acesso autenticado “Lista de compras”. |

A tela separa itens `Pendentes` e `Comprados`; os comprados podem ser recolhidos. Há confirmação antes de remover, aviso não bloqueante para duplicata pendente e suporte à quantidade decimal com vírgula. A página trata estados vazio, carregamento, erro, conflito e residência sem vínculo. Não há atualização em tempo real.

## 3. Backend

O módulo fica em `backend/src/shopping-list/`:

| Arquivo | Responsabilidade |
| --- | --- |
| `shopping-list.module.ts` | Registra controller, serviço e repositório do módulo. |
| `shopping-list.controller.ts` | Rotas autenticadas e leitura dos dados do usuário e da residência. |
| `shopping-list.service.ts` | Valida vínculo ativo, regras de quantidade/unidade, ordenação e respostas. |
| `shopping-list.repository.ts` | Consultas e alterações persistidas, incluindo comparação de versão. |
| `dto/create-shopping-list-item.dto.ts` | Validação dos campos de criação. |
| `dto/update-shopping-list-item.dto.ts` | Validação de edição e versão esperada. |
| `dto/update-shopping-list-status.dto.ts` | Validação de conclusão e reabertura. |

### 3.1. Endpoints identificados

Todas as rotas exigem autenticação JWT e validam os UUIDs recebidos.

| Método | Rota | Função |
| --- | --- | --- |
| `GET` | `/residences/:residenceId/shopping-list/items` | Listar os itens da residência. |
| `POST` | `/residences/:residenceId/shopping-list/items` | Criar item pendente. |
| `PATCH` | `/residences/:residenceId/shopping-list/items/:itemId` | Editar campos usando `version`. |
| `PATCH` | `/residences/:residenceId/shopping-list/items/:itemId/status` | Concluir ou reabrir usando `version`. |
| `DELETE` | `/residences/:residenceId/shopping-list/items/:itemId?version=:version` | Remover com confirmação na interface e versão esperada na API. |

### 3.2. Regras e persistência

- Qualquer membro ativo da residência pode operar qualquer item da lista.
- A criação define a residência e a participação criadora no servidor; o status inicial é `PENDENTE`.
- Quantidade e unidade precisam estar ambas preenchidas ou ambas vazias. A quantidade aceita até três casas decimais, limitada pelo tipo `Decimal(12,3)`.
- A conclusão registra participação e horário atuais. Reabrir limpa os campos de conclusão.
- Atualizações e remoções com versão desatualizada não sobrescrevem ou removem a versão atual.
- Quando a participação histórica é removida, a referência de autoria pode ficar nula e o item permanece ligado à residência.
- Pendentes são ordenados por criação mais recente; comprados, pela conclusão mais recente, com desempate estável por identificador.
- A tabela `item_lista_compras`, o enum de status, as restrições e os índices estão definidos em `backend/prisma/schema.prisma` e na migração `backend/prisma/migrations/20261101010000_add_shopping_list/migration.sql`.
- Marcar como comprado não altera a despensa nem o financeiro.

## 4. Rastreabilidade

| Entrega | Critério | Evidência no código |
| --- | --- | --- |
| CRUD e status compartilhados | Acesso e ciclo de vida do item | Controller, serviço e repositório do módulo `shopping-list`. |
| Isolamento residencial | Só membros ativos consultam ou alteram | `ResidenceAccessService` usado pelo serviço. |
| Edição segura contra concorrência | Versão antiga não sobrescreve versão recente | `updateMany` condicionado à versão no repositório. |
| Aviso de duplicata | Avisar sem impedir duplicatas intencionais | Normalização e confirmação na página da lista. |
| Separação de módulos | Compra não altera estoque ou gastos | Lista persiste em tabela própria; sem chamada aos módulos de despensa ou financeiro. |

## 5. Estado da entrega

Código e testes automatizados da aplicação estão presentes. As tarefas OpenSpec 4.1–4.5 continuam como verificações pendentes, incluindo validação com membros/dados reais, comportamento após saída de morador, revisão final dos cenários e capturas de evidência.
