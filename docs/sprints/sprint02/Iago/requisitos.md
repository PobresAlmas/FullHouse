# Sprint 02 — Requisitos de subgrupos de despesas

**Responsável:** Iago
**Módulo:** Financeiro — subgrupos de despesas
**Requisito relacionado:** extensão complementar de RF005/US004 e RF006/US005

## 1. Objetivo

Permitir que moradores organizem despesas compartilhadas em subgrupos, para que cada conta seja dividida somente entre as pessoas que participam daquele subgrupo.

Esta funcionalidade complementa o CRUD de despesas documentado em `docs/sprints/sprint01/Iago/`. Os critérios desta entrega não criam um novo requisito RF numerado no documento `docs/req.pdf`.

## 2. Requisitos funcionais

- O morador pode criar um subgrupo com nome e participantes ativos da residência.
- O sistema valida nome e participantes antes de criar ou atualizar o subgrupo.
- Somente o criador do subgrupo pode editar seu nome e seus participantes.
- Um subgrupo pode ter várias despesas individuais associadas, como energia e internet.
- Cada despesa vinculada ao subgrupo é dividida somente entre seus participantes.
- A divisão de uma despesa pode ser igualitária ou personalizada. O rateio personalizado deve incluir os participantes válidos e somar exatamente o valor da despesa.
- Cada despesa mantém seus próprios comprovantes; comprovantes não são compartilhados automaticamente com as outras despesas do subgrupo.
- Moradores inativos ou de outra residência não podem ser associados ao subgrupo.

## 3. Critérios de aceitação

1. O usuário consegue consultar os moradores ativos da residência e selecioná-los ao criar um subgrupo.
2. Subgrupos são listados nas opções financeiras e ficam disponíveis para despesas futuras.
3. Um usuário que não criou o subgrupo recebe acesso negado ao tentar editá-lo.
4. Mais de uma despesa pode ser vinculada ao mesmo subgrupo, mantendo registro e divisão próprios para cada conta.
5. Rateios personalizados com membros ausentes, repetidos ou soma diferente do total são rejeitados.

## 4. Rastreabilidade

- Implementação: `docs/sprints/sprint02/Iago/subgrupos/implementacao.md`.
- Testes e comandos: `docs/sprints/sprint02/Iago/subgrupos/testes.md`.
