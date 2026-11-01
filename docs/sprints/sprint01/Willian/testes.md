# Sprint 01 — Testes funcionais e evidências: Pets

**Responsável:** Antonio Willian Silva Oliveira<br>  
**Módulo:** Pets e histórico de cuidados/gastos<br>
**Requisito relacionado:** RF014 — US012  
**Data da execução automatizada:** 01/11/2026

## 1. Objetivo e escopo

Este documento registra os testes automatizados executados para a entrega de Pets e fornece um roteiro para demonstração manual integrada. Testes de interface usam mocks; os testes E2E do módulo usam JWT real de teste, mas substituem o serviço por mock. Portanto, essas suítes não substituem uma demonstração manual com frontend, API e banco conectados.

## 2. Resultado da execução automatizada

| Suíte | Comando | Resultado observado |
| --- | --- | --- |
| Backend completo (unitários) | `cd backend && pnpm test` | **Aprovado:** 30 arquivos, 172 testes. |
| Backend E2E completo | `cd backend && pnpm test:e2e` | **Aprovado:** 7 arquivos, 33 testes. |
| Frontend completo | `cd web && pnpm exec vitest run` | **Aprovado:** 53 arquivos, 150 testes. |
| Pets — serviço/repositório | `cd backend && pnpm exec vitest run src/pets/pets.service.spec.ts src/pets/pets.repository.spec.ts --reporter=dot` | **Aprovado:** 2 arquivos, 11 testes. |
| Pets — endpoints E2E | `cd backend && pnpm exec vitest run --config ./vitest.config.e2e.ts test/pets.e2e-spec.ts --reporter=dot` | **Aprovado:** 1 arquivo, 6 testes. |
| Pets — interface | `cd web && pnpm exec vitest run 'app/(private)/pets/__test__/page.test.tsx' --reporter=dot` | **Aprovado:** 1 arquivo, 4 testes. |

As três suítes completas e os três comandos específicos de Pets terminaram com código de saída zero. Houve avisos do Vitest sobre o plugin `vite-tsconfig-paths`/configuração nativa, sem falhas associadas.

### Pré-requisito observado

Na primeira tentativa da suíte E2E geral, dois arquivos falharam ao importar um enum Prisma inexistente no cliente gerado. A causa foi cliente gerado desatualizado. Após executar o comando abaixo, a suíte E2E completa foi repetida e passou (33/33). Inclua essa geração antes das suítes de backend ao trocar de branch ou atualizar o schema:

```bash
cd backend
pnpm exec prisma generate --config prisma7.config.ts
```

Esse comando gera o cliente localmente; não aplica migrações ao banco.

## 3. Cobertura dos testes específicos de Pets

### Backend unitário — 11 testes

- Criação de pet associada à participação autenticada.
- Ocultação de residência fora das participações ativas.
- Atualização de campos editáveis sem alteração de casa/criador.
- Restrição da exclusão a líder/administrador no comportamento implementado.
- Rejeição de pagador de outra casa.
- Rejeição de despesa de outra casa ou indisponível.
- Registro do autor do cuidado.
- Atualização e remoção com verificação do escopo do pet.
- Ordenação do histórico do mais recente para o mais antigo.

### Backend E2E — 6 testes

- Listagem da residência.
- Criação válida e rejeição de campo não permitido no body.
- Consulta da ficha com histórico.
- Atualização e exclusão pelas rotas de residência.
- Criação, listagem, atualização e remoção de registros de cuidado.
- Rejeição de intervalo de datas inválido.

### Frontend — 4 testes

- Exibição da residência e criação de pet.
- Seletor de residência quando o usuário possui mais de uma.
- Ficha e criação de registro de cuidado.
- Edição e confirmação de exclusão.

## 4. Matriz de testes manuais para apresentação

Executar com dados fictícios em banco local de desenvolvimento. Preencher a coluna de resultado durante a demonstração; os cenários manuais **não foram executados nesta rodada**.

| ID | Cenário | Passos | Resultado esperado | Status manual |
| --- | --- | --- | --- | --- |
| MP01 | Acesso à seção | Entrar com morador ativo e abrir Pets pelo menu. | A página mostra a casa atual, vínculo e lista/estado vazio. | A executar |
| MP02 | Cadastro | Criar “Mel”, espécie Cachorro, raça e data de nascimento opcionais. | Pet aparece na lista e sua ficha pode ser aberta. | A executar |
| MP03 | Validação | Tentar salvar sem nome ou espécie. | Formulário impede o envio e mostra validação. | A executar |
| MP04 | Edição | Alterar nome/raça e salvar. | A ficha/lista mostra os valores atualizados após recarga. | A executar |
| MP05 | Histórico | Registrar vacina com título, data e custo; abrir a ficha. | O evento fica visível no histórico, com data e valor. | A executar |
| MP06 | Pagador/despesa | Selecionar membro ativo e despesa da mesma casa ao registrar cuidado. | Registro é salvo com as associações selecionadas. | A executar |
| MP07 | Compartilhamento | Abrir sessão com outro morador ativo da mesma casa. | O segundo morador consegue consultar o pet e seu histórico. | A executar |
| MP08 | Exclusão autorizada | Entrar com perfil autorizado conforme a regra atualmente implementada; pedir exclusão e confirmar. | Confirmação aparece e o pet some da listagem. | A executar |
| MP09 | Escopo da residência | Acessar com usuário que não pertence à casa. | API não expõe os dados; interface apresenta erro/ausência de acesso. | A executar |

**Atenção para MP08:** o código atual permite exclusão a Líder/Administrador, mas ainda não implementa a alternativa “criador do registro” explicitamente. Não registre esse critério como aprovado para criador não administrador até o ajuste e novo teste.

## 5. Executar o sistema para teste manual

### 5.1. Preparar dependências

Requisitos: Node.js compatível com o projeto, pnpm e Docker/Compose para PostgreSQL. Use exclusivamente banco de desenvolvimento ou descartável.

```bash
docker compose up -d postgres
docker compose ps
```

Configure `backend/.env` com os valores locais exigidos em `backend/src/app.module.ts`: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET` e `MINIO_REGION`. Para rodar a API localmente, configure o endpoint do MinIO como `http://localhost:9000` e valores de desenvolvimento para bucket/credenciais; a imagem é URL, e o fluxo básico de Pets não precisa enviar arquivo.

Configure `web/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Instale dependências se necessário e gere o Prisma Client:

```bash
cd backend && pnpm install
pnpm exec prisma generate --config prisma7.config.ts
```

Prepare o schema do banco **somente após confirmar que `DATABASE_URL` aponta para o banco local de desenvolvimento**. Este repositório possui baseline completo mais migração incremental de Pets. Em um banco descartável novo, aplique as migrações com `pnpm exec prisma migrate deploy --config prisma7.config.ts`. Em uma base preexistente cujo schema já corresponda ao baseline, siga o procedimento de baseline em `openspec/changes/add-pets-module/design.md` antes de `migrate deploy`; não execute o baseline como migração inicial sobre uma base já preenchida.

### 5.2. Iniciar API e frontend

Use dois terminais separados:

```bash
cd backend
pnpm start:dev
```

```bash
cd web
pnpm dev
```

Abra `http://localhost:3001`, crie/entre com uma conta de teste que pertença a uma residência ativa e use o item Pets no menu. Se ainda não houver casa ou participação, configure os dados de teste pelas rotinas já existentes do projeto antes de iniciar os cenários.

### 5.3. Reexecutar os testes automatizados

```bash
cd backend
pnpm exec prisma generate --config prisma7.config.ts
pnpm test
pnpm test:e2e
```

Em outro terminal ou após concluir o backend:

```bash
cd web
pnpm exec vitest run
```

Para executar somente os testes de Pets, use os três comandos específicos da tabela da seção 2.

## 6. Capturar e organizar evidências

Salve capturas reais, sem editar o conteúdo para alterar resultados, dentro de `docs/sprints/sprint01/Willian/evidencias/`. Recomenda-se PNG, nomes numerados e largura suficiente para mostrar a página e a URL/estado relevante. Antes da captura, remova informações pessoais e não mostre senhas, tokens, cookies, códigos, `.env` ou dados reais.

Roteiro sugerido:

1. `01-pets-lista.png` — página Pets aberta, casa/vínculo e lista carregada.
2. `02-pets-cadastro.png` — formulário preenchido antes de salvar, com dados fictícios.
3. `03-pets-ficha.png` — pet salvo e ficha aberta.
4. `04-pets-historico.png` — histórico mostrando ao menos um cuidado e custo fictícios.
5. `05-pets-edicao.png` — alteração salva e refletida na ficha/lista.
6. `06-pets-confirmacao-exclusao.png` — diálogo de confirmação antes de excluir (use pet descartável).
7. `07-pets-exclusao-concluida.png` — listagem após remoção (opcional, use para provar o resultado).
8. `08-testes-backend.png` — terminal com comando e resumo de testes aprovados.
9. `09-testes-frontend.png` — terminal com comando e resumo de testes aprovados.

No Linux, use a ferramenta de captura do ambiente gráfico (por exemplo, `Print Screen`/Captura de tela) e salve diretamente na pasta indicada. No Windows, use `Win+Shift+S`; no macOS, `Shift+Command+4`. Capture uma imagem por estado, confira se o texto está legível e não inclua dados secretos. A pasta `evidencias/` deve conter somente arquivos efetivamente capturados; não foram geradas capturas nesta execução automatizada.

## 7. Registro e conclusão

**Testes automatizados:** backend unitário 172/172 aprovados; backend E2E 33/33 aprovados; frontend 150/150 aprovados.  
**Testes automatizados específicos de Pets:** unitários 11/11; E2E 6/6; interface 4/4 aprovados.  
**Testes manuais:** ainda a executar pelo responsável durante a preparação da apresentação.  
**Ponto pendente de requisito:** exclusão pelo criador que não seja líder/administrador, conforme descrito na seção 4 e em `requisitos.md`.
