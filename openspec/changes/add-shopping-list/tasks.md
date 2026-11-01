# Tasks — Lista de compras compartilhada

> Nenhuma tarefa está concluída. Executar e marcar cada item somente após implementação e verificação.

## 1. Conferência das convenções existentes

- [ ] 1.1 Conferir prefixo residencial, autenticação, validação e respostas dos módulos existentes; seguir os mesmos padrões.
- [ ] 1.2 Confirmar enum de unidades da despensa (`UNIDADE`, `KG`, `G`, `L`, `ML`, `PACOTE`) e reutilizá-lo.
- [ ] 1.3 Confirmar representação de participação histórica e configurar referência que não apague itens quando um morador sair.
- [ ] 1.4 Confirmar que o banco e Prisma suportam `Decimal(12,3)` e estratégia de controle otimista por versão.

## 2. Backend

- [ ] 2.1 Criar persistência de itens ligados diretamente à residência, sem entidade de listas nomeadas.
- [ ] 2.2 Implementar consulta, criação, edição, conclusão, reabertura e remoção com validação de vínculo ativo em cada operação.
- [ ] 2.3 Implementar validações de nome, quantidade, unidade, observação e status inicial no servidor.
- [ ] 2.4 Registrar autoria de criação e conclusão atual; preservar itens se referências a participações forem removidas.
- [ ] 2.5 Implementar comparação atômica de `version` em edição, transição e remoção; retornar conflito sem sobrescrita.
- [ ] 2.6 Cobrir autorização, validação, transições repetidas, referências históricas, conflitos e remoção.

## 3. Frontend

- [ ] 3.1 Adicionar `Lista de compras` à navegação autenticada e mostrar a residência atual.
- [ ] 3.2 Criar tela com seções `Pendentes` e `Comprados`, ordenação definida e seção de comprados recolhível.
- [ ] 3.3 Implementar inclusão/edição com quantidade/unidade pareadas, observação e mensagens de validação.
- [ ] 3.4 Implementar aviso não bloqueante para duplicata pendente, confirmação explícita e prevenção de duplo envio.
- [ ] 3.5 Implementar concluir, reabrir e remover com confirmação.
- [ ] 3.6 Tratar lista vazia, ausência de pendentes, carregamento, erro, sucesso, conflito e item removido.
- [ ] 3.7 Limpar contexto e descartar resposta atrasada ao trocar de residência.
- [ ] 3.8 Cobrir estados e interações principais da tela.

## 4. Verificação e entrega

- [ ] 4.1 Verificar que concluir item não altera despensa ou financeiro.
- [ ] 4.2 Verificar que membros ativos compartilham alterações e usuários sem vínculo não acessam dados.
- [ ] 4.3 Verificar comportamento quando criador/comprador deixa a residência.
- [ ] 4.4 Revisar todos os cenários de `specs/shopping-list/spec.md`.
- [ ] 4.5 Capturar evidências dos fluxos principais e estados de erro.
