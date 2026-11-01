# Tasks — Gerenciar categorias da despensa

> Nenhuma tarefa está concluída. O cutover depende do diagnóstico e da resolução de todos os valores legados ambíguos ou inválidos.

## 1. Inspeção e diagnóstico de dados

- [ ] 1.1 Conferir contratos atuais de itens da despensa, validação e autorização por residência; preservar compatibilidade até o cutover.
- [ ] 1.2 Fazer diagnóstico somente de leitura por residência: rótulos, contagens, valores vazios/longos e colisões pela normalização especificada.
- [ ] 1.3 Produzir relatório de mapeamento; usar categoria inicial como canônica quando equivalente sem ambiguidade; solicitar aprovação para colisões customizadas.
- [ ] 1.4 Confirmar capacidade de implementar unicidade normalizada, restrição item-categoria por residência e FK restritiva com o banco/Prisma usados.
- [ ] 1.5 Confirmar se há política central de gestão compartilhada da despensa; reutilizá-la ou aplicar fallback definido na spec.

## 2. Persistência, seed e migração

- [ ] 2.1 Criar modelo de categoria por residência, chave normalizada e restrição de unicidade.
- [ ] 2.2 Criar integridade item-categoria na mesma residência e impedir remoção de categoria em uso.
- [ ] 2.3 Provisionar as oito categorias iniciais em novas residências, transacional e idempotentemente.
- [ ] 2.4 Implementar migração aditiva: manter texto antigo, adicionar relação anulável, criar categorias e preencher relações.
- [ ] 2.5 Aplicar somente mapeamentos aprovados; não atribuir `Outros` a dados vazios ou ambíguos.
- [ ] 2.6 Validar todos os itens antes do cutover e trocar a leitura para a relação persistida.
- [ ] 2.7 Manter coluna textual por uma versão e documentar migração posterior para removê-la.
- [ ] 2.8 Ensaiar rollback atualizando texto legado a partir da categoria atual de todos os itens.

## 3. API e interface

- [ ] 3.1 Implementar consulta e CRUD de categorias com autorização e validações especificadas.
- [ ] 3.2 Implementar gerenciamento num modal acessível a partir da despensa.
- [ ] 3.3 Atualizar criação/edição de item para exigir categoria da residência carregada pela API.
- [ ] 3.4 Atualizar listagem e filtros para exibir nomes persistidos sem alterar semântica de itens privados/comunitários.
- [ ] 3.5 Tratar residência sem categorias e bloqueio de exclusão de categoria em uso.

## 4. Verificação e entrega

- [ ] 4.1 Cobrir autorização, validação de nome, unicidade concorrente, associação entre residências e remoção em uso.
- [ ] 4.2 Verificar categorias iniciais, renomeação/remoção e que categorias excluídas não são recriadas.
- [ ] 4.3 Verificar backfill com nomes customizados, colisões, valores inválidos, idempotência e preservação do rótulo original.
- [ ] 4.4 Verificar que nenhuma residência ou item perde dados e que a versão antiga pode voltar a ler a coluna textual.
- [ ] 4.5 Revisar todos os cenários de `specs/pantry-categories/spec.md` e capturar evidências.
