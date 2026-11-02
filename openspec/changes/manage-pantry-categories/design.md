# Design — Gerenciar categorias da despensa

## Modelo e escopo

Cada categoria pertence a uma residência. Itens da despensa usam uma relação para uma categoria da mesma residência. Não haverá catálogo global nem tabela separada de categorias por módulo.

Modelo conceitual:

| Campo | Regra |
| --- | --- |
| `id` | Identificador estável. |
| `residenceId` | Obrigatório; escopo de autorização e unicidade. |
| `name` | Nome exibido, 1 a 80 caracteres após normalização de espaços. |
| `normalizedName` | Chave de comparação usada para impedir duplicatas dentro da residência. |
| `createdAt` / `updatedAt` | Datas definidas pelo servidor. |

O item deve referenciar `categoryId`. A associação valida no servidor que item e categoria pertencem à mesma residência; preferir também restrição composta no banco. A FK de categoria usa exclusão restrita.

## Autorização

- Todo membro ativo pode consultar categorias da residência.
- Gestão (criar, renomear, remover sem uso) segue a política central já existente para gestão compartilhada da despensa, caso exista.
- Sem política central explícita, qualquer membro ativo pode gerir categorias. Não inventar novos papéis.
- Cada operação revalida vínculo e residência no servidor.

## Normalização e duplicatas

Para criar a chave de comparação: trim, reduzir sequências de espaços a um, normalizar Unicode de forma decomposta, remover diacríticos e converter para minúsculas de forma estável. Pontuação continua significativa.

O nome de exibição preserva acentos e capitalização escolhidos pelo morador. A unicidade da chave é por residência e deve estar protegida pelo banco para impedir duplicatas em operações simultâneas.

Exemplos equivalentes: `Grãos`, `grãos`, `GRAOS` e `  Grãos  `.

Mensagens:

- “Informe o nome da categoria.”
- “O nome da categoria deve ter no máximo 80 caracteres.”
- “Já existe uma categoria com esse nome nesta casa.”
- “Esta categoria está sendo usada por itens da despensa. Reclassifique os itens antes de removê-la.”

## Categorias iniciais e ciclo de vida

Persistir Bebidas, Doces, Grãos, Higiene, Laticínios, Limpeza, Massas e Outros para cada residência.

- Residências novas recebem as categorias na inicialização da residência, transacionalmente com o fluxo existente quando possível.
- Residências existentes recebem as que faltam em backfill idempotente, sem duplicar categorias equivalentes.
- Categorias iniciais não são protegidas: podem ser renomeadas ou removidas se não tiverem itens associados; `Outros` segue a mesma regra.
- Categoria removida não é recriada em consultas posteriores.
- Nenhuma categoria é fallback automático para dados ou novos itens sem classificação.
- Se a casa não tiver categorias, impedir novo item sem categoria e oferecer “Gerenciar categorias”.

## Remoção e concorrência

Remoção física somente quando nenhum item usa a categoria. O servidor verifica uso e executa a remoção com integridade referencial restritiva. Se inclusão de item e remoção ocorrerem simultaneamente, a FK/transação impede item órfão; uma operação falha integralmente e exibe mensagem compreensível.

Renomear categoria altera o nome apresentado por todos os itens associados sem regravar os itens.

## Migração aditiva

### 1. Diagnóstico somente de leitura

Listar, por residência, rótulo original, chave normalizada, quantidade de itens e validade (vazio, tamanho). Produzir mapeamento antes de aplicar alterações.

- Se um rótulo legado colidir com categoria inicial, usar o nome inicial como canônico e registrar todos os rótulos de origem.
- Se dois rótulos customizados colidirem, bloquear cutover e pedir aprovação do nome canônico/mapeamento.
- Para valores vazios ou inválidos, registrar exceção e aguardar mapeamento aprovado; nunca usar `Outros` automaticamente.
- Preservar rótulos originais no relatório e na coluna legada enquanto a nova relação estiver em validação.

### 2. Expandir e preencher

- Criar tabela de categorias, restrições e coluna `categoryId` inicialmente anulável.
- Criar categorias padrão e customizadas por casa, conforme mapeamento aprovado.
- Associar itens sem apagar ou modificar o texto antigo.
- Fazer seed/backfill idempotentes; migrações de schema permanecem versionadas pelo mecanismo existente.

### 3. Validar e fazer cutover

Só trocar a leitura para relação nova depois de verificar que todo item tem categoria válida da mesma casa, nenhuma linha foi perdida e os rótulos diferentes correspondem a mapeamentos aprovados. Depois, tornar a relação obrigatória conforme viabilidade técnica. Manter a coluna antiga na primeira versão; removê-la numa migração posterior.

## Interface e contrato

- A ação `Gerenciar categorias` abre modal acessível a partir da despensa.
- O modal permite listar, criar, renomear e pedir remoção, explicando bloqueio para categoria em uso.
- Usar “categorias cadastradas”, sem conceito de categoria ativa/inativa.
- O formulário de item consulta categorias da residência; nunca usa nomes hardcoded como fonte definitiva.
- Nomes de endpoint e DTO seguem convenções existentes.

## Rollback

Antes de voltar à leitura textual, popular a coluna antiga com o nome da categoria atualmente associada a todos os itens, inclusive itens criados depois do cutover. Preservar snapshot dos rótulos originais e mapeamentos aprovados. Não remover a tabela/relacionamento novo até a versão anterior estar operando; não depender apenas de backup antigo que apagaria alterações posteriores.
