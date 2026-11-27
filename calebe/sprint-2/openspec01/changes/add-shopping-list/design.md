# Design — Lista de compras compartilhada

## Recorte

Uma lista por residência, formada por itens associados diretamente à casa. Não há entidade de listas nomeadas. A lista é independente da despensa e do financeiro: marcar como comprado não altera estoque nem cria despesa.

## Modelo conceitual

| Campo | Regra |
| --- | --- |
| `id` | Identificador estável. |
| `residenceId` | Obrigatório e imutável; residência proprietária do item. |
| `name` | Obrigatório; 1 a 100 caracteres após trim; sequências de espaços internos viram um espaço. |
| `quantity` | Opcional; se preenchida, maior que zero, até 3 casas decimais, `Decimal(12,3)`. |
| `unit` | Obrigatória quando há quantidade; vazia quando não há quantidade. |
| `notes` | Opcional; até 500 caracteres após trim. |
| `status` | `PENDENTE` ou `COMPRADO`; o servidor sempre inicia em `PENDENTE`. |
| `createdByMembershipId` | Participação criadora, atribuída pelo servidor; nula se a referência histórica for removida. |
| `createdAt` / `updatedAt` | Datas definidas pelo servidor. |
| `purchasedByMembershipId` | Participação que realizou a conclusão atual; nula enquanto pendente. |
| `purchasedAt` | Horário da conclusão atual; nulo enquanto pendente. |
| `version` | Inteiro crescente para rejeitar edição, conclusão ou remoção baseada em versão desatualizada. |

O limite representável em `Decimal(12,3)` é 999.999.999,999. A interface pt-BR aceita vírgula decimal; a API recebe número decimal normalizado. Rejeitar zero, valores negativos, não numéricos, fora do intervalo ou com mais de três casas decimais.

### Unidades

Reutilizar as unidades existentes na despensa: `UNIDADE`, `KG`, `G`, `L`, `ML`, `PACOTE`. Não permitir texto livre. Quantidade e unidade são opcionais em conjunto, nunca isoladamente.

### Mensagens de validação

- “Informe o nome do item.”
- “O nome deve ter no máximo 100 caracteres.”
- “Informe uma quantidade maior que zero.”
- “Use no máximo três casas decimais.”
- “Selecione a unidade da quantidade informada.”
- “Informe a quantidade para usar uma unidade.”
- “A observação deve ter no máximo 500 caracteres.”

## Autorização e autoria

- Qualquer membro ativo da residência pode consultar, criar, editar, concluir, reabrir e remover qualquer item.
- Toda operação valida vínculo ativo e residência proprietária no servidor.
- Encerrar o vínculo de quem criou ou comprou não remove os itens nem mantém acesso à lista.
- Referências a participações não podem apagar itens em cascata; se a referência histórica for removida, defini-la como nula e exibir `Usuário indisponível`.

## Duplicatas

Duas entradas equivalentes são permitidas porque podem representar marcas ou necessidades distintas. Para o aviso visual, comparar nome Unicode normalizado, ignorando caixa, acentos e espaços excedentes, mas preservando pontuação.

Se já houver item `PENDENTE` equivalente na mesma residência, mostrar “Já existe um item pendente com esse nome. Deseja adicionar outro?” com ações “Adicionar mesmo assim” e “Cancelar”. A confirmação cria um registro separado e nunca altera o item existente. Itens `COMPRADO` não disparam o aviso. Desabilitar novas submissões enquanto a requisição atual estiver em andamento.

## Status, ordenação e concorrência

- Criar sempre como `PENDENTE`, independentemente do corpo enviado pelo cliente.
- Concluir grava `COMPRADO`, `purchasedByMembershipId` e `purchasedAt`.
- Reabrir grava `PENDENTE` e limpa os dois campos de conclusão, preservando criador e data original.
- Repetir a operação para o status já atual não substitui autoria, horário nem versão.
- `PATCH` e `DELETE` exigem `version` esperada; comparar e atualizar atomicamente. Em conflito, não sobrescrever e retornar estado de conflito.
- Pendentes primeiro, por criação mais recente. Comprados depois, por conclusão mais recente. Empates usam `id` crescente. A seção comprados pode ser recolhida, mas continua acessível.
- Sem WebSocket: atualizar após operações locais e consultas normais. Descartar respostas atrasadas após troca de residência.

## Interface

A navegação usa o rótulo `Lista de compras` e o cabeçalho identifica a residência atual. A rota e os DTOs seguem as convenções residenciais existentes.

A tela oferece adicionar, editar, marcar comprado, reabrir e remover. Remoção exige confirmação: “Remover este item da lista? Esta ação não pode ser desfeita.”

Estados mínimos:

- Lista vazia: “Sua lista de compras está vazia.” e ação “Adicionar item”.
- Sem pendentes, com comprados: “Nenhum item pendente.”; comprados permanecem acessíveis.
- Falha: “Não foi possível carregar a lista de compras.” e ação “Tentar novamente”.
- Conflito de edição: “Este item foi alterado por outro morador. Atualize os dados antes de salvar novamente.”
