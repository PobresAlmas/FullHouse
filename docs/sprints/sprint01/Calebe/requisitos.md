# Sprint 01 — Requisitos da despensa

**Responsável:** Calebe Mesquita<br>
**Módulo:** Despensa virtual<br>
**Requisito relacionado:** RF022 — Despensa virtual<br>
**História relacionada:** US020

## 1. Requisito funcional

### RF022 — Despensa virtual

Como morador, quero criar uma despensa virtual marcando itens como comunitários ou privados, para deixar claro o que pode ou não ser consumido por todos.

**Prioridade:** Importante

No documento de requisitos, a história US020 está relacionada diretamente ao RF022. Os identificadores RF017 e US015 tratam separadamente das notificações de vencimento.

## 2. História de usuário — US020

**Cartão**

Como morador, quero registrar os itens da casa em uma despensa virtual, marcando cada um como comunitário ou privado, para deixar claro o que pode ser consumido por todos.

**Conversa**

André relatou que, quando alguém leva algo para casa, avisa se todos podem consumir ou se o item pertence apenas a essa pessoa. João Vitor explicou que a casa passou a identificar os produtos com o nome do dono para evitar dúvidas sobre o que é compartilhado.

**Confirmação — Critérios de aceitação**

- Cada item deve ter nome, dono e indicação de que é comunitário ou privado.
- Itens privados devem exibir claramente o nome do morador dono.
- Deve ser possível informar a data de validade de cada item.

## 3. Funcionalidades complementares identificadas no código

Além dos critérios da US020, o módulo oferece recursos de controle de estoque e organização:

- Cadastro de categoria, unidade, quantidade inicial e quantidade mínima.
- Registro de entradas e consumo pela interface. A API também aceita descarte; a página ainda não oferece uma ação de descarte.
- Atualização do saldo calculado a partir das movimentações.
- Classificação adicional como item de dono específico, além de comunitário e privado.
- Busca e filtros por tipo, categoria, responsável e validade.
- Indicação visual de estoque baixo e de itens vencidos ou próximos do vencimento.

Esses recursos complementam RF022. A página destaca itens vencidos ou próximos do vencimento, mas não envia notificações. O envio de alertas de validade pertence ao escopo separado de RF017/US015.

## 4. Base documental

Os critérios de RF022 e US020 foram consultados em `docs/req.pdf`, no Documento de Especificação de Requisitos do FullHouse. Os detalhes técnicos e os testes encontrados no código estão registrados em `implementacao.md` e `testes.md`.
