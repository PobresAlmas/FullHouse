# Sprint 01 — Implementação do módulo de Pets

**Responsável:** Antonio Willian Silva Oliveira<br>
**Módulo principal:** Pets e histórico de cuidados<br>
**Requisito relacionado:** RF014 — US012

## 1. Visão geral

O módulo de Pets integra a interface Next.js, a API NestJS e a persistência PostgreSQL via Prisma. Ele permite manter os animais vinculados a uma casa e o histórico coletivo de cuidados e gastos. Os nomes de domínio existentes no banco são `casa`, `participacao`, `pet`, `cuidado_pet` e `despesa`; a API expõe os campos em camelCase e usa o termo residência nas rotas.

Esta documentação descreve os arquivos e comportamentos encontrados no repositório. Os resultados de execução constam em `testes.md`. A regra de exclusão do pet tem uma diferença em relação ao requisito de negócio, registrada nas seções 3 e 7.

## 2. Frontend

| Arquivo | Responsabilidade |
| --- | --- |
| `web/app/(private)/pets/page.tsx` | Página autenticada, seleção da residência, formulário do pet, lista/ficha, histórico e formulários de cuidado. |
| `web/features/pets/api/pets.api.ts` | Tipos TypeScript e chamadas HTTP de residências, membros, pets e cuidados. |
| `web/app/(private)/finance/page.tsx` | Navegação que direciona o item Pets para `/pets`. |
| `web/app/(private)/pets/__test__/page.test.tsx` | Testes da página: cadastro, troca de residência, detalhes/histórico, edição e confirmação de exclusão. |

### Fluxo de interface

1. A página consulta as residências ativas do usuário autenticado.
2. Se houver mais de uma residência, apresenta um seletor; se houver apenas uma, usa essa casa diretamente.
3. Carrega pets, membros ativos e despesas da residência selecionada.
4. O formulário permite informar nome, espécie, raça, nascimento e URL de foto.
5. Ao selecionar um pet, apresenta seus dados e o histórico; o formulário de cuidado aceita tipo, título, data, descrição, custo, pagador e despesa.
6. Ações de edição, remoção e registro de cuidado são mostradas de acordo com permissões disponíveis para a residência.
7. A exclusão pede confirmação antes de enviar a requisição.

## 3. Backend

| Arquivo | Responsabilidade |
| --- | --- |
| `backend/src/pets/pets.module.ts` | Registra o módulo e suas dependências. |
| `backend/src/pets/pets.controller.ts` | Rotas REST protegidas por `JwtAuthGuard`; obtém o usuário autenticado via `CurrentUser`. |
| `backend/src/pets/pets.service.ts` | Regras de autorização, validações entre residência/membro/despesa e transformação das respostas. |
| `backend/src/pets/pets.repository.ts` | Consultas e gravações via Prisma. |
| `backend/src/pets/dto/` | Validação de criação/edição, filtros e formato de resposta. |
| `backend/src/app.module.ts` | Inclui `PetsModule` na aplicação. |
| `backend/test/pets.e2e-spec.ts` | Exercita endpoints REST com JWT de teste, validação de body e códigos HTTP. |
| `backend/src/pets/pets.service.spec.ts` | Testa regras de serviço e permissões de Pets/cuidados. |
| `backend/src/pets/pets.repository.spec.ts` | Testa consultas, ordenação e filtro de despesa por residência. |

O `ValidationPipe` global em `backend/src/main.ts` usa `whitelist`, `forbidNonWhitelisted` e `transform`. Assim, campos inesperados (por exemplo `residenceId` enviado no body de criação) são rejeitados.

### Endpoints

As rotas abaixo exigem JWT. Erros usuais: `400` para dados inválidos, `401` para sessão ausente/inválida, `403` para operação não autorizada e `404` para recurso inexistente ou fora da residência acessível.

| Método | Rota | Uso | Resposta de sucesso |
| --- | --- | --- | --- |
| `GET` | `/residences` | Listar residências ativas do usuário. | `200`, lista com residência e participação. |
| `GET` | `/residences/:residenceId/members` | Listar membros ativos para seleção de pagador. | `200`, lista de membros. |
| `GET` | `/residences/:residenceId/pets?search=` | Listar pets por nome (busca opcional). | `200`, lista de pets. |
| `POST` | `/residences/:residenceId/pets` | Criar pet. Body: `name`, `species`; demais campos opcionais. | `201`, pet criado. |
| `GET` | `/residences/:residenceId/pets/:petId` | Consultar ficha e histórico. | `200`, pet com `careLogs`. |
| `PATCH` | `/residences/:residenceId/pets/:petId` | Atualizar campos editáveis do pet. | `200`, pet atualizado. |
| `DELETE` | `/residences/:residenceId/pets/:petId` | Excluir pet. | `200`, `{ id, deleted: true }`. |
| `GET` | `/pets/:petId/care-logs?type=&from=&to=` | Consultar histórico; filtros são opcionais. | `200`, registros por data decrescente. |
| `POST` | `/pets/:petId/care-logs` | Registrar cuidado/gasto. Body: `type`, `title`, `date`; outros campos opcionais. | `201`, registro criado. |
| `PATCH` | `/pets/:petId/care-logs/:careLogId` | Atualizar cuidado. | `200`, registro atualizado. |
| `DELETE` | `/pets/:petId/care-logs/:careLogId` | Remover cuidado. | `200`, `{ id, deleted: true }`. |

Ao registrar ou atualizar cuidados, `paidById` precisa apontar para membro ativo na mesma casa, e `expenseId` precisa apontar para despesa disponível da casa do pet. A data inicial do filtro não pode ser posterior à final.

## 4. Persistência e migrações

O schema Prisma relaciona o pet à casa e à participação que o criou. `cuidado_pet` relaciona-se ao pet, à participação que registrou, ao pagador opcional e à despesa opcional. A migração `backend/prisma/migrations/20261011000000_add_pets_module/migration.sql` acrescenta URL da foto e timestamps, cria o enum de tipo de cuidado, preserva o texto antigo em `titulo` e cria índices.

O histórico Prisma foi inicializado nesta change com um baseline completo anterior à migração de Pets. **Não execute `migrate resolve` ou `migrate deploy` contra banco com dados importantes sem confirmar o estado e o procedimento do ambiente.** Em banco descartável, siga as instruções de setup do projeto e aplique as migrações apenas no banco local de desenvolvimento. Para banco existente, o baseline deve ser registrado como já aplicado uma única vez antes das migrações incrementais, conforme documentado em `openspec/changes/add-pets-module/design.md`.

## 5. Dependências e execução

- Backend: NestJS, Prisma/PostgreSQL, JWT e `class-validator` já presentes no projeto.
- Frontend: Next.js, React, cliente HTTP e componentes já presentes no projeto.
- Não há serviço externo novo específico do módulo. Foto é armazenada como URL; upload binário não integra o escopo.
- As variáveis obrigatórias de desenvolvimento são definidas em `backend/src/app.module.ts`; use valores locais e nunca inclua segredos reais em capturas de tela.

Comandos de inicialização e teste manual estão em `testes.md`.

## 6. Migração de registros legados

O tipo anterior de cuidado era texto livre. A migração adiciona o campo `titulo`, copia para ele o texto antigo e mapeia categorias reconhecidas para o enum. Valores sem correspondência tornam-se `OTHER`, enquanto o texto original fica preservado no título.

## 7. Pontos a acompanhar

- **Regra de exclusão:** a implementação atual autoriza líderes e administradores por meio de `requireManager`; o requisito de negócio especifica criador ou Administrador. O serviço não confere explicitamente o criador. Esse item deve ser ajustado para afirmar aderência integral ao critério.
- **Cobertura E2E:** os testes da API usam NestJS, JWT de teste e serviço mockado; eles validam transporte, autenticação e contrato HTTP, sem conectar o banco real.
- **Cobertura da tela:** os testes de página mockam chamadas HTTP. A integração real entre web, API e banco deve ser demonstrada no roteiro manual.
- **Fotos:** só URL é aceita; upload e armazenamento do arquivo não são implementados.
