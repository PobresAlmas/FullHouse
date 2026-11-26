# Sprint 03 — Requisitos de Configurações da casa

**Responsável:** Emilson<br>
**Módulo:** Configurações da casa<br>
**OpenSpec:** [SPEC-003 — Configurações da casa](../../../../openspec02/spec/003-configuracoes-da-casa/requirements.md)

## 1. Objetivo

Reunir dados da residência, moradores, permissões, preferências e notificações em **Configurações**. O morador consulta as informações autorizadas e salva suas preferências. Líderes e administradores gerenciam os dados da casa e o acesso dos demais moradores.

## 2. Requisitos funcionais

| Referência na SPEC-003       | Comportamento no repositório                                                                                                                                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF01–RF02 — Navegação        | A rota `/settings` apresenta Minha conta, Casa, Moradores, Permissões, Notificações e Preferências. Os parâmetros `section` e `tab` selecionam a seção ou aba. A página apresenta um estado próprio para a conta sem residência.          |
| RF03–RF04 — Casa e moradores | Consultar dados da residência e moradores ativos. Gestores podem atualizar o nome da casa.                                                                                                                                                |
| RF05–RF06 — Permissões       | A API lê e grava a política global `TODOS` ou `LIDERES`, além de aceitar a herança da política no acesso individual. A tabela da interface permite à gestão alternar **Pode editar** e **Somente leitura** e remover moradores elegíveis. |
| RF07 — Categorias            | Em **Preferências → Categorias**, listar, criar, renomear e excluir categorias com a API da despensa. Categorias em uso exigem reclassificação dos itens.                                                                                 |
| RF08–RF09 — Preferências     | Guardar preferências de avisos, Despensa, Financeiro e Pets por usuário e residência. Aplicar a exibição de vencidos e atrasados nas telas correspondentes. O envio de alertas depende dos eventos disponíveis.                           |
| RF10 — Notificações          | Consultar os avisos persistidos da conta, filtrar por leitura, carregar mais registros e marcar um aviso como lido.                                                                                                                       |
| RF11 — Tema                  | Oferecer **Claro**, **Escuro** e **Sistema**, com escolha persistida no navegador. A verificação visual completa das telas permanece no checklist da spec.                                                                                |

## 3. Critérios de aceitação

1. Uma conta vinculada abre Casa, consulta moradores e mantém a seção ou a aba após recarregar. Uma conta sem residência recebe o estado correspondente.
2. Um gestor salva um nome válido e o vê na navegação. Uma tentativa sem autorização mantém o nome anterior.
3. Um gestor altera o acesso individual de um morador elegível e a opção fica persistida. O servidor protege as alterações na política global e a remoção de moradores.
4. Uma categoria vazia pode ser criada, renomeada e removida. Uma categoria com itens vinculados permanece disponível e a tela apresenta a dependência.
5. Salvar uma preferência na aba escolhida preserva as outras opções. O filtro de notificações não lidas e a marcação individual usam os dados da conta autenticada.
6. A seleção de tema sobrevive à recarga. No modo Sistema, a escolha acompanha a aparência do dispositivo.

A edição da política global e a restauração da herança do acesso individual estão disponíveis pelo contrato HTTP nesta branch. Os controles de interface correspondentes constam na spec.

## 4. Rastreabilidade

- RF023/US021, RN001 e RN002 descrevem acesso e permissões. RF022/US020 contextualiza as categorias da despensa. RF017/US015 e RNF005 orientam a evolução dos avisos. [Documento de Especificação de Requisitos — FullHouse](<../../../../docs/Documento de Especificação de Requisitos - FullHouse.pdf>)
- [Implementação](implementacao.md) e [testes e evidências](testes.md).
- [Design](../../../../openspec02/spec/003-configuracoes-da-casa/design.md) e [tarefas e pendências da SPEC-003](../../../../openspec02/spec/003-configuracoes-da-casa/tasks.md).
- As outras entregas do Emilson nesta sprint são [Negociação e convites — SPEC-004](negociacao-e-convites/requisitos.md) e [Paginação da negociação — SPEC-005](paginacao-da-negociacao/requisitos.md).
