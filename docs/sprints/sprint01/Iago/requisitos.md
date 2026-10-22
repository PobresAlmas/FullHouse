# Sprint 01 — Requisitos implementados

**Responsável:** Iago<br>
**Módulo:** Gestão de despesas<br>
**Requisitos relacionados:** RF005 e RF006 — US004 e US005

## 1. Requisitos funcionais

### RF005 — Cadastro de despesas

Como administrador, quero cadastrar despesas dentro do grupo para que os moradores acompanhem os gastos da casa.

**Prioridade:** Essencial  
**História relacionada:** US004

### RF006 — Conclusão de despesas

Como morador, quero marcar uma despesa como concluída para que o grupo saiba que ela foi quitada.

**Prioridade:** Essencial  
**História relacionada:** US005

## 2. Histórias de usuário

### US004 — Cadastro das despesas do grupo

**Cartão**

Como administrador, quero cadastrar as despesas do grupo, como aluguel, energia e internet, para que os moradores acompanhem os gastos da casa.

**Conversa**

André relatou que aluguel, energia e internet são divididos igualmente entre os quatro moradores, sem acompanhamento mensal em planilha. Calebe sugeriu que as contas do mês pudessem ser configuradas como fixas ou variáveis.

**Confirmação — Critérios de aceitação**

- A despesa deve ter descrição, valor, data de vencimento e indicação de conta fixa ou variável.
- O valor deve ser dividido igualmente entre os moradores participantes, exibindo a parte de cada um.
- A despesa cadastrada deve ficar visível para todos os membros do grupo.

### US005 — Marcar a parte da despesa como paga

**Cartão**

Como morador, quero marcar como paga a minha parte de uma despesa para que o grupo saiba o que já foi quitado.

**Conversa**

André relatou que cada morador avisa no grupo de mensagens da casa quando paga uma conta, deixando as informações dispersas. João Vitor sugeriu mostrar quem já pagou e quem ainda não pagou cada compra ou conta.

**Confirmação — Critérios de aceitação**

- Ao marcar sua parte como paga, a data do pagamento deve ser registrada.
- Todos os membros do grupo devem ver quem já pagou e quem ainda não pagou.
- A despesa deve ser marcada como concluída automaticamente quando todas as partes forem pagas.

## 3. Funcionalidades complementares identificadas no código

Além dos requisitos acima, a implementação da tela Financeiro contempla listagem, edição e exclusão lógica de despesas, status geral Pendente/Pago, filtro por status, validações de entrada e totalizador da lista. O subgrupo é opcional.

O fluxo atual não configura despesas fixas e não controla parcelas ou pagamentos individuais por morador. A diferença entre os critérios do documento de requisitos e o escopo implementado está detalhada em `implementacao.md` e `testes.md`.

## 4. Base documental

Os requisitos foram consultados em `docs/req.pdf`, em RF005, RF006 e nos cartões US004 (página lógica 14) e US005 (página lógica 15). O escopo desta entrega é o CRUD de despesas na tela Financeiro.
