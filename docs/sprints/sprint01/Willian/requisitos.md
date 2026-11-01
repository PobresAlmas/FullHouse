# Sprint 01 — Requisitos implementados: módulo de Pets

**Responsável:** Antonio Willian Silva Oliveira<br>
**Módulo:** Pets e histórico de cuidados da residência<br>
**Requisito relacionado:** RF014 — US012

## 1. História de usuário — US012

**Cartão**

Como morador de uma casa compartilhada, quero cadastrar os animais da residência e registrar seus cuidados e gastos, para que os moradores acompanhem em conjunto as informações e o histórico dos pets.

**Conversa**

A funcionalidade contempla os dados básicos do animal, sua vinculação à casa, a consulta por todos os membros ativos e os registros de vacinação, alimentação, consultas, medicações e outros cuidados. Os registros podem conter custo, morador pagador e vínculo com uma despesa compartilhada.

**Confirmação — critérios de aceitação**

- Um morador autenticado e ativo pode cadastrar pet com nome e espécie obrigatórios.
- Raça, data de nascimento e URL de foto são opcionais. A idade, se apresentada, é derivada da data de nascimento.
- Os pets podem ser listados por residência, consultados por identificador, atualizados e removidos conforme a regra de autorização.
- O histórico pode ser criado, consultado, atualizado e removido por membros ativos da residência.
- O histórico é ordenado do mais recente para o mais antigo e é compartilhado com os membros ativos da casa.
- Tipos de cuidado: `VACCINE`, `FOOD`, `VET_VISIT`, `MEDICATION` e `OTHER`.
- Pagador e despesa, quando informados, devem pertencer à mesma residência do pet.
- Usuários sem participação ativa não podem consultar nem alterar dados de outra residência.
- Campos e parâmetros inválidos são rejeitados pela API sem persistir a operação.
- A interface apresenta a navegação Pets, residência e vínculo do usuário, formulário, lista/ficha do animal e histórico, conforme `docs/images/Pets.png`.

## 2. Regras de autorização

- As rotas de Pets exigem sessão JWT válida.
- Para leitura, criação ou edição, o usuário deve ter participação ativa na casa correspondente.
- A política da residência também é aplicada à criação e edição de conteúdo.
- O requisito de negócio solicita que a exclusão do pet seja permitida ao criador ou a um Administrador.
- **Diferença identificada na implementação atual:** o serviço usa `requireManager` para excluir pet, o que limita a operação a Líder/Administrador e não verifica explicitamente se o solicitante é o criador. A matriz de testes automatizados atual cobre a autorização de Líder/Administrador; a regra criador-ou-Administrador precisa ser alinhada no código antes de declarar esse critério integralmente atendido.
- Cuidados e despesas vinculadas não autorizam excluir a própria despesa quando um registro de cuidado é removido. A exclusão do pet elimina seus registros de cuidado em cascata.

## 3. Campos de domínio

### Pet

| Campo | Obrigatório | Descrição |
| --- | --- | --- |
| `id` | Sim | Identificador UUID. |
| `name` | Sim | Nome do animal. |
| `species` | Sim | Espécie; exemplos: Cachorro, Gato, Pássaro ou Outro. |
| `breed` | Não | Raça. |
| `birthDate` | Não | Data de nascimento; idade pode ser derivada. |
| `residenceId` | Sim | Identificador da casa (`casa` no banco). |
| `photoUrl` | Não | URL da foto; upload de arquivo não faz parte do escopo. |
| `createdById` | Sim | Identificador da participação que criou o registro. |

### Registro de cuidado — PetCareLog

| Campo | Obrigatório | Descrição |
| --- | --- | --- |
| `id` | Sim | Identificador UUID. |
| `petId` | Sim | Pet relacionado. |
| `type` | Sim | Um dos tipos de cuidado definidos acima. |
| `title` | Sim | Título do evento. |
| `description` | Não | Detalhes adicionais. |
| `date` | Sim | Data do cuidado (`YYYY-MM-DD`). |
| `cost` | Não | Valor não negativo. |
| `paidById` | Não | Participação do morador que pagou/realizou. |
| `expenseId` | Não | Despesa compartilhada associada. |
| `createdById` | Sim | Participação que registrou o evento. |

## 4. Rastreabilidade

| Entrega | Critério | Evidência no código |
| --- | --- | --- |
| Listar e cadastrar pets | RF014 / US012 | `GET` e `POST /residences/:residenceId/pets`; página Pets. |
| Consultar e editar pet | RF014 / US012 | `GET` e `PATCH /residences/:residenceId/pets/:petId`. |
| Remover pet | RF014 / US012 | `DELETE /residences/:residenceId/pets/:petId`; ver diferença de autorização descrita acima. |
| Histórico compartilhado | RF014 / US012 | Rotas `/pets/:petId/care-logs`; acesso autorizado pela residência do pet. |
| Referências a membro e despesa | RF014 / US012 | Validação no serviço/repositório e relações Prisma com `participacao` e `despesa`. |
| Interface web | RF014 / US012 | `web/app/(private)/pets/page.tsx` e `web/features/pets/api/pets.api.ts`. |
| Testes automatizados | Ver `testes.md` | Specs de serviço/repositório, E2E e página Pets. |
