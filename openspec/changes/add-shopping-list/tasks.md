# Tasks — Lista de compras compartilhada

> Backend e frontend implementados. Testes unitários, HTTP e de interface cobrem os fluxos principais; verificações de migração e dados reais seguem pendentes.

## 1. Conferência das convenções existentes

- [x] 1.1 Conferir prefixo residencial, autenticação, validação e respostas dos módulos existentes; seguir os mesmos padrões.
- [x] 1.2 Confirmar enum de unidades da despensa (`UNIDADE`, `KG`, `G`, `L`, `ML`, `PACOTE`) e reutilizá-lo.
- [x] 1.3 Confirmar representação de participação histórica e configurar referência que não apague itens quando um morador sair.
- [x] 1.4 Confirmar que o banco e Prisma suportam `Decimal(12,3)` e estratégia de controle otimista por versão.

## 2. Backend

- [x] 2.1 Criar persistência de itens ligados diretamente à residência, sem entidade de listas nomeadas.
- [x] 2.2 Implementar consulta, criação, edição, conclusão, reabertura e remoção com validação de vínculo ativo em cada operação.
- [x] 2.3 Implementar validações de nome, quantidade, unidade, observação e status inicial no servidor.
- [x] 2.4 Registrar autoria de criação e conclusão atual; preservar itens se referências a participações forem removidas.
- [x] 2.5 Implementar comparação atômica de `version` em edição, transição e remoção; retornar conflito sem sobrescrita.
- [x] 2.6 Cobrir autorização, validação, transições repetidas, referências históricas, conflitos e remoção.

## 3. Frontend

- [x] 3.1 Adicionar `Lista de compras` à navegação autenticada e mostrar a residência atual.
- [x] 3.2 Criar tela com seções `Pendentes` e `Comprados`, ordenação definida e seção de comprados recolhível.
- [x] 3.3 Implementar inclusão/edição com quantidade/unidade pareadas, observação e mensagens de validação.
- [x] 3.4 Implementar aviso não bloqueante para duplicata pendente, confirmação explícita e prevenção de duplo envio.
- [x] 3.5 Implementar concluir, reabrir e remover com confirmação.
- [x] 3.6 Tratar lista vazia, ausência de pendentes, carregamento, erro, sucesso, conflito e item removido.
- [x] 3.7 Limpar contexto e descartar resposta atrasada ao trocar de residência.
- [x] 3.8 Cobrir estados e interações principais da tela.

## 4. Verificação e entrega

- [ ] 4.1 Verificar que concluir item não altera despensa ou financeiro.
- [ ] 4.2 Verificar que membros ativos compartilham alterações e usuários sem vínculo não acessam dados.
- [ ] 4.3 Verificar comportamento quando criador/comprador deixa a residência.
- [ ] 4.4 Revisar todos os cenários de `specs/shopping-list/spec.md`.
- [ ] 4.5 Capturar evidências dos fluxos principais e estados de erro.
