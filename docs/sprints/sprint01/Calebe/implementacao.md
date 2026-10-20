# Sprint 01 — Implementação da despensa

**Responsável:** Calebe Mesquita<br>
**Módulo principal:** Despensa virtual<br>
**Requisitos relacionados:** RF022 — US020

## 1. Visão geral

O módulo da despensa permite consultar e organizar os itens de uma residência, registrar alterações no estoque e identificar a quem cada item pertence. A interface Next.js consome uma API NestJS protegida por autenticação. O backend verifica a participação do usuário na residência e aplica as regras de acesso a cada item.

Esta documentação descreve o que está implementado nos arquivos do repositório. Os resultados das suítes automatizadas executadas estão registrados em `testes.md`; a validação manual da interface permanece separada.

## 2. Frontend

| Recurso | Arquivo principal | Papel |
|---|---|---|
| Página da despensa | `web/app/(private)/pantry/page.tsx` | Carrega residência, membros e itens; apresenta filtros, tabela, formulários e ações. |
| Integração HTTP e tipos | `web/features/pantry/api/pantry.api.ts` | Define os tipos da despensa e as chamadas à API. |
| Testes da página | `web/app/(private)/pantry/__test__/page.test.tsx` | Verifica registro de quantidade decimal e rejeição de mais de duas casas decimais. |

Na página, o usuário pode selecionar uma residência ativa, adicionar ou editar itens, registrar entrada ou consumo, remover itens e filtrar a listagem. A API aceita também movimentações do tipo descarte, mas a página não apresenta uma ação para registrá-las. As categorias padrão incluem bebidas, doces, grãos, higiene, laticínios, limpeza, massas e outros; também são aceitas categorias cadastradas nos itens.

Os itens são apresentados com nome, categoria, tipo de propriedade, responsável, quantidade e validade. A interface permite filtros por todos, comunitários, privados, itens do usuário, categoria, responsável e situação de validade. O estoque é destacado quando a quantidade atual é menor ou igual à quantidade mínima cadastrada. Datas vencidas ou com vencimento nos próximos sete dias recebem destaque visual.

## 3. Backend

O módulo está organizado em `backend/src/pantry/`:

| Arquivo | Responsabilidade |
|---|---|
| `pantry.module.ts` | Registra controller, serviço e repositório, com acesso ao módulo Prisma. |
| `pantry.controller.ts` | Define as rotas HTTP e aplica guarda JWT, validação e conversão dos dados recebidos. |
| `pantry.service.ts` | Aplica as regras de residência, propriedade, responsáveis e permissões; prepara os dados de resposta. |
| `pantry.repository.ts` | Consulta e altera itens e movimentações com Prisma. |
| `dto/create-pantry-item.dto.ts` | Valida dados de criação. |
| `dto/update-pantry-item.dto.ts` | Valida campos opcionais de atualização. |
| `dto/create-pantry-movement.dto.ts` | Valida tipo e quantidade de movimentação. |
| `dto/pantry-item-list-query.dto.ts` | Valida e normaliza o parâmetro de busca. |

### 3.1. Endpoints identificados

Todas as rotas ficam sob `/residences/:residenceId/pantry` e exigem autenticação JWT.

| Método | Rota | Função |
|---|---|---|
| `GET` | `/members` | Listar moradores ativos da residência para seleção de responsável. |
| `GET` | `/items` | Listar itens visíveis; aceita `search` para busca por nome ou categoria. |
| `POST` | `/items` | Cadastrar item e, se a quantidade inicial for maior que zero, registrar a entrada inicial. |
| `PATCH` | `/items/:itemId` | Atualizar os dados cadastrais do item. |
| `POST` | `/items/:itemId/movements` | Registrar entrada, consumo ou descarte. |
| `DELETE` | `/items/:itemId` | Excluir o item. |

Os parâmetros de residência e item são validados como UUID. Os DTOs removem propriedades não permitidas, normalizam textos e convertem valores numéricos antes do serviço.

### 3.2. Regras de propriedade e estoque

- **Comunitário:** o responsável exibido é a casa e moradores ativos da residência podem registrar movimentações e editar o item. Para excluí-lo, a API exige que a pessoa que o cadastrou ou um administrador/líder faça a operação.
- **Privado:** pertence ao morador que o cadastrou. O item só aparece para esse morador; somente ele pode alterar seus dados, movimentar ou excluir o item.
- **Dono específico:** fica associado a um morador escolhido. O item exibe esse responsável; somente o dono pode movimentá-lo. O dono, a pessoa que o cadastrou ou um administrador/líder pode editar ou excluir o item.
- A quantidade atual é calculada somando entradas e subtraindo consumo e descarte. Uma saída acima do saldo disponível é rejeitada.
- O registro de movimentação usa transação e bloqueio da linha do item durante a verificação de saldo, evitando aceitar saídas simultâneas que excedam o estoque.
- A unidade não pode ser alterada depois que o item possui movimentações registradas.
- Nome e categoria têm limites de tamanho; quantidades aceitam até duas casas decimais e a data de validade usa formato de data estrito.

### 3.3. Persistência

O modelo `item_despensa` armazena residência, nome, categoria, propriedade, responsável, unidade, quantidade mínima, validade e participação que cadastrou o item. O modelo `movimentacao_despensa` mantém o tipo, a quantidade, o autor e o momento de cada movimentação. Os modelos estão definidos em `backend/prisma/schema.prisma`.

As migrações relacionadas presentes no repositório incluem `20261012000000_add_pantry_category` e `20261013000000_add_specific_pantry_owner`, além da migração base do sistema.

## 4. Rastreabilidade

| Entrega | Critério / enquadramento | Evidência no código |
|---|---|---|
| Cadastro de nome, responsável e tipo | RF022 / US020 | Formulário da página, DTO de criação e regras em `PantryService`. |
| Exibição do dono e do tipo | RF022 / US020 | Resposta do serviço inclui `ownerName` e `property`; tabela mostra ambos. |
| Data de validade | RF022 / US020 | DTOs, persistência Prisma e formulário/listagem da despensa. |
| Saldo e movimentações | Complementar | `movimentacao_despensa`, `PantryRepository` e controles da página. |
| Acesso autenticado e por residência | Segurança e isolamento de dados | `JwtAuthGuard` e busca de participação ativa no serviço/repositório. |
| Aviso de vencimento | Relacionado ao requisito separado RF017 / US015 | A página destaca itens vencidos e com vencimento nos próximos sete dias; o módulo não envia notificações. |
