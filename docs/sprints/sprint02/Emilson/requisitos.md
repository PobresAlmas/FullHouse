# Sprint 02 — Requisitos da Home

**Responsável:** Emilson<br>
**Módulo:** Home do FullHouse<br>
**Change OpenSpec:** `implement-home-dashboard`

## 1. Objetivo

Como usuário autenticado, quero abrir a Home e visualizar as informações relevantes para minha rotina. Se ainda não faço parte de uma casa, quero poder criar minha primeira residência.

## 2. Requisitos funcionais

| Capacidade OpenSpec      | Requisito                                                                                                                                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `home-without-residence` | Confirmar que a pessoa não tem residência antes de mostrar o formulário de criação. Validar o nome e criar a casa com o vínculo inicial de gestão do criador.                                                          |
| `residence-home`         | Identificar a casa pelo nome cadastrado e mostrar tarefas atrasadas e de hoje, contas próximas, membros e resumo semanal com dados autorizados da residência. O cartão de avisos informa quando não há fonte de dados. |
| `personal-home`          | Alternar entre a casa e o modo Pessoal. Mostrar tarefas e despesas individuais da conta autenticada, com resumo semanal e sem a lista de moradores.                                                                    |

## 3. Critérios de aceitação

1. A rota inicial autenticada abre a Home. Durante a consulta de residência, a tela diferencia carregamento, erro e ausência de vínculo.
2. Ao informar um nome válido, o usuário cria a residência e passa a vê-la na Home com o vínculo de gestão. Se o cadastro falhar, a tela exibe o erro e preserva o nome para nova tentativa.
3. A Home da casa mostra dados da residência selecionada. Uma falha na consulta de um cartão permite consultar os demais. Se tiver acesso a outro contexto residencial, os dados anteriores são descartados ao trocar.
4. Ao alternar para Pessoal, as tarefas, contas e indicadores vêm da conta autenticada. Ao voltar, a Home apresenta novamente a casa selecionada.
5. Cartões sem registros mostram um estado vazio. Vencimentos vêm dos dados persistidos e a tela identifica o bloco de avisos como indisponível quando não há uma fonte de avisos da casa.

## 4. Rastreabilidade

| Requisito / história                               | Relação com a entrega                                                                                                                                                                         |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF003 / US002 — Criação de grupo com administrador | A Home permite criar a primeira residência e vincula o criador como `LIDER`, papel com acesso de gestão. Convites pertencem ao fluxo próprio de entrada em uma residência.                    |
| RF018 / US016 — Tarefas e despesas individuais     | O modo Pessoal consulta e apresenta registros individuais já cadastrados. O cadastro é feito nos módulos correspondentes.                                                                     |
| RF020 / US018 — Dashboard individual               | A Home Pessoal apresenta contas próximas e resumo da semana. Os critérios financeiros da história incluem saldo devedor, total pago no mês e dívidas por credor, que ficam fora desta change. |
| RF023 / US021 — Controle de permissões             | O painel consulta dados de residências acessíveis à conta autenticada e mantém o escopo individual separado do residencial.                                                                   |

- [Documento de Especificação de Requisitos atualizado](../../../Documento%20de%20Especifica%C3%A7%C3%A3o%20de%20Requisitos%20-%20FullHouse.pdf)
- [Proposta](../../../../openspec/changes/implement-home-dashboard/proposal.md), [design](../../../../openspec/changes/implement-home-dashboard/design.md) e [cenários OpenSpec](../../../../openspec/changes/implement-home-dashboard/specs/)
- [Implementação](implementacao.md) e [testes](testes.md)
