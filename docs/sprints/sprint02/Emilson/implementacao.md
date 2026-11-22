# Sprint 02 — Implementação da Home

**Responsável:** Emilson<br>
**Módulo:** Home do FullHouse<br>
**Change OpenSpec:** `implement-home-dashboard`

## 1. Visão geral

A rota inicial autenticada passou a abrir a Home. A tela apresenta a criação da primeira residência quando não há vínculo e, quando há uma casa, permite alternar entre a visão residencial e a pessoal. A mudança reaproveita as consultas dos módulos de tarefas e financeiro para compor o painel.

## 2. Frontend

| Arquivo                                     | Responsabilidade                                                                                                                    |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `web/app/(private)/page.tsx`                | Renderiza a Home na rota inicial autenticada.                                                                                       |
| `web/features/home/components/HomePage.tsx` | Carrega a residência, controla a troca de contexto e renderiza o formulário, os cartões e os estados de carregamento, vazio e erro. |
| `web/features/home/api/home.api.ts`         | Consulta o painel pessoal usando a sessão autenticada.                                                                              |
| `web/features/home/lib/home-metrics.ts`     | Classifica tarefas e calcula as métricas semanais no fuso `America/Fortaleza`.                                                      |
| `web/components/layout/AppSidebar.tsx`      | Disponibiliza a Home na navegação e adapta as opções conforme o vínculo residencial.                                                |

## 3. Backend

| Método | Rota autenticada                         | Função                                                                                      |
| ------ | ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| `GET`  | `/residences`                            | Lista as residências acessíveis e o papel do usuário em cada uma.                           |
| `POST` | `/residences`                            | Cria a residência e o vínculo inicial com o criador, identificado pela sessão.              |
| `GET`  | `/residences/:residenceId/tasks`         | Consulta as tarefas permitidas para o usuário na casa.                                      |
| `GET`  | `/residences/:residenceId/tasks/members` | Lista os membros ativos que aparecem no cartão de moradores.                                |
| `GET`  | `/expenses`                              | Retorna despesas autorizadas. A Home residencial seleciona as que pertencem à casa exibida. |
| `GET`  | `/home/personal`                         | Retorna tarefas e despesas individuais do usuário autenticado.                              |

## 4. Regras de persistência e apresentação

- O repositório de residências cria a casa e a participação `LIDER` na mesma transação. A identidade do criador vem do JWT. A versão atual rejeita a criação de outra residência quando a conta já tem uma participação ativa.
- O repositório da Home filtra tarefas e despesas pessoais pelo identificador autenticado e pelo escopo `INDIVIDUAL`. Se uma das duas consultas falhar, a outra continua disponível.
- O cartão de contas próximas considera contas pendentes com vencimento persistido entre hoje e os seis dias seguintes. O resumo usa a semana de segunda a segunda e conta pagamentos pelo dia de quitação.
- O cartão **Aviso da casa** apresenta indisponibilidade. O progresso semanal usa as tarefas reais disponíveis no contexto atual.

## 5. Rastreabilidade

| Entrega                               | Referência                                                                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Home sem residência e criação da casa | [`home-without-residence`](../../../../openspec/changes/implement-home-dashboard/specs/home-without-residence/spec.md) |
| Painel residencial e métricas         | [`residence-home`](../../../../openspec/changes/implement-home-dashboard/specs/residence-home/spec.md)                 |
| Painel pessoal e privacidade          | [`personal-home`](../../../../openspec/changes/implement-home-dashboard/specs/personal-home/spec.md)                   |

Os cenários e comandos estão em [testes.md](testes.md).
