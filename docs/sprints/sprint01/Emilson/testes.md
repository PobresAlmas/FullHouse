# Sprint 01 — Testes funcionais e evidências

**Responsável:** Francisco Emilson Santos Souza Filho  
**Módulo:** Autenticação (cadastro, login, logout, recuperação de senha e sessão)  
**Requisitos relacionados:** RF001, RF002 — US001  
**Base documental:** Documento de Especificação de Requisitos do FullHouse, US001.

## 1. Objetivo e escopo

Verificar o comportamento das funcionalidades de autenticação entregues na Sprint 1 e sua aderência aos critérios de confirmação da US001. Além dos cenários obrigatórios de cadastro e login, o escopo inclui logout, sessão e recuperação de senha, desenvolvidos como recursos complementares do módulo.

Este documento registra os testes automatizados e manuais executados pelo responsável pela implementação. **O responsável informou que todos os testes realizados passaram.** Os status dos cenários são registrados com base nessa declaração; logs, relatórios e contagens individuais não foram fornecidos para conferência independente.

## 2. Critérios de aceitação da US001

A história de usuário US001 reúne os requisitos RF001 (cadastro) e RF002 (login):

> Como visitante, quero criar uma conta com nome, e-mail e senha e entrar no sistema com essas credenciais, para acessar o FullHouse com segurança.

Critérios constantes no documento de requisitos:

1. Cadastro com nome, e-mail e senha, sem solicitar endereço ou documentos.
2. Impedimento de criação de contas duplicadas com o mesmo e-mail.
3. Negação de acesso com mensagem de erro quando e-mail ou senha estão incorretos.

**Nota:** logout, JWT e recuperação de senha estão documentados aqui como entregas complementares; não foi atribuído a eles um RF inexistente.

## 3. Matriz de testes funcionais

**Pré-condição comum:** backend e frontend configurados; banco de dados disponível; usuário de teste criado quando necessário. Usar dados fictícios, sem credenciais reais em capturas ou logs. Em cada execução, preencher **Resultado obtido**, **Status** e **Evidência**.

| ID    | Requisito / fluxo                   | Procedimento resumido                                                  | Resultado esperado                                                               | Testes existentes relacionados                                                | Status   |
| ----- | ----------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------- |
| CT001 | RF001 — cadastro válido             | Informar nome, e-mail novo e senha válida; enviar cadastro.            | Conta criada; frontend avança no fluxo previsto.                                 | `RegisterForm.test.tsx`, `auth.service.spec.ts`                               | Aprovado |
| CT002 | RF001 — campos obrigatórios         | Tentar cadastrar sem nome, e-mail ou senha.                            | Formulário impede envio ou API rejeita os dados e informa o erro.                | `schemas.test.ts`, `RegisterForm.test.tsx` (verificar cobertura específica)   | Aprovado |
| CT003 | RF001 — e-mail duplicado            | Criar conta e tentar cadastrar novamente com o mesmo e-mail.           | Segunda conta não é criada; erro apresentado.                                    | Verificar cobertura em `users.service.spec.ts` e teste integrado              | Aprovado |
| CT004 | RF002 — login válido                | Informar e-mail cadastrado e senha correta.                            | Autenticação bem-sucedida e acesso à rota privada prevista.                      | `LoginForm.test.tsx`, `auth.service.spec.ts`                                  | Aprovado |
| CT005 | RF002 — senha incorreta             | Tentar login com e-mail existente e senha inválida.                    | Acesso negado e mensagem de erro; usuário permanece no login.                    | `LoginForm.test.tsx`, `auth.service.spec.ts` (verificar cobertura específica) | Aprovado |
| CT006 | RF002 — e-mail não cadastrado       | Tentar login com e-mail inexistente.                                   | Acesso negado, sem autenticação.                                                 | Complementar com execução integrada                                           | Aprovado |
| CT007 | RF002 — validação de formulário     | Informar e-mail inválido ou senha vazia.                               | Formulário não envia dados inválidos e indica necessidade de correção.           | `LoginForm.test.tsx`, `schemas.test.ts`                                       | Aprovado |
| CT008 | Sessão — acesso autenticado         | Fazer login e consultar `/auth/me`; abrir área privada.                | Usuário autenticado identificado e acesso permitido.                             | `auth.controller.spec.ts`, `auth.api.test.ts`, `AuthProvider.test.tsx`        | Aprovado |
| CT009 | Sessão — acesso sem autenticação    | Abrir rota privada sem sessão válida.                                  | Acesso protegido e redirecionamento/bloqueio conforme implementação.             | `ProtectedRoute.test.tsx`, `AuthProvider.test.tsx`                            | Aprovado |
| CT010 | Logout                              | Autenticar e acionar logout; tentar consultar área privada.            | Sessão encerrada; cookie removido e acesso privado não autorizado.               | `auth.controller.spec.ts`, `auth.api.test.ts`                                 | Aprovado |
| CT011 | Lembrar de mim                      | Comparar logins com a opção desmarcada e marcada.                      | Tempo de vida do cookie de 1 dia e 30 dias, respectivamente, conforme o backend. | `auth.controller.spec.ts`, `LoginForm.test.tsx`                               | Aprovado |
| CT012 | Recuperação — solicitar código      | Informar e-mail de conta cadastrada no formulário de recuperação.      | Solicitação processada; fluxo avança para validação de código.                   | `ForgotPasswordForm.test.tsx`, `password-reset.service.spec.ts`               | Aprovado |
| CT013 | Recuperação — código válido         | Inserir código válido recebido dentro do prazo.                        | Código aceito; frontend avança para definição de nova senha.                     | `VerifyEmailForm.test.tsx`, `auth.service.spec.ts`                            | Aprovado |
| CT014 | Recuperação — código inválido       | Inserir código incorreto.                                              | Código rejeitado; não é possível redefinir a senha.                              | `VerifyEmailForm.test.tsx`, `auth.service.spec.ts`                            | Aprovado |
| CT015 | Recuperação — alterar senha         | Inserir nova senha e confirmação correspondente após código válido.    | Senha redefinida; senha nova passa a autenticar o usuário.                       | `CreateNewPasswordForm.test.tsx`, `auth.service.spec.ts`                      | Aprovado |
| CT016 | Recuperação — senhas divergentes    | Preencher nova senha e confirmação diferentes.                         | Formulário bloqueia submissão e sinaliza divergência.                            | `CreateNewPasswordForm.test.tsx`                                              | Aprovado |
| CT017 | Recuperação — código expirado/usado | Tentar redefinir a senha com código expirado ou previamente consumido. | Código recusado; senha não alterada.                                             | `password-reset.repository.spec.ts` (verificar casos específicos)             | Aprovado |
| CT018 | Recuperação — e-mail inexistente    | Solicitar recuperação de conta não cadastrada.                         | Resposta genérica sem revelar existência da conta.                               | `auth.service.spec.ts`                                                        | Aprovado |

## 4. Inventário de testes automatizados encontrados

Os caminhos abaixo são relativos às raízes respectivas de `backend/` e `app/`, conforme os arquivos de código enviados. O responsável confirmou ter executado as suítes com sucesso; **esta documentação não constitui uma execução independente**.

### Backend (NestJS)

| Arquivo                                                | Escopo observado                                                                                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/auth/auth.controller.spec.ts`                     | Cadastro; cookies de login e opção lembrar de mim; logout; delegação de recuperação; `/auth/me`; tratamento de falha de autenticação. |
| `src/auth/auth.service.spec.ts`                        | Cadastro, login válido, resposta genérica de recuperação, redefinição de senha e casos de falha.                                      |
| `src/auth/jwt.strategy.spec.ts`                        | Estratégia de validação de autenticação JWT.                                                                                          |
| `src/crypto/password.service.spec.ts`                  | Serviço de hashing e verificação de senha.                                                                                            |
| `src/password-reset/password-reset.service.spec.ts`    | Geração de código de seis dígitos, expiração de 15 minutos, envio e delegação de verificação/consumo.                                 |
| `src/password-reset/password-reset.repository.spec.ts` | Regras de persistência e validação dos códigos de recuperação.                                                                        |
| `src/email/email.service.spec.ts`                      | Serviço de envio de e-mails.                                                                                                          |
| `src/users/users.service.spec.ts`                      | Operações de usuários relacionadas ao cadastro.                                                                                       |

### Frontend (Next.js)

| Arquivo                                                            | Escopo observado                                                |
| ------------------------------------------------------------------ | --------------------------------------------------------------- |
| `features/auth/components/__test__/LoginForm.test.tsx`             | Login, navegação, validação e feedback de erro.                 |
| `features/auth/components/__test__/RegisterForm.test.tsx`          | Cadastro e mensagens de erro.                                   |
| `features/auth/components/__test__/ForgotPasswordForm.test.tsx`    | Solicitação de código e validação de e-mail.                    |
| `features/auth/components/__test__/VerifyEmailForm.test.tsx`       | Verificação e reenvio de código.                                |
| `features/auth/components/__test__/CreateNewPasswordForm.test.tsx` | Redefinição de senha e confirmação.                             |
| `features/auth/components/schemas/__test__/schemas.test.ts`        | Esquemas de validação dos formulários.                          |
| `features/auth/api/__test__/auth.api.test.ts`                      | Chamadas HTTP de login, cadastro, sessão, logout e recuperação. |
| `providers/__test__/AuthProvider.test.tsx`                         | Estado e ações de sessão no frontend.                           |
| `components/auth/__test__/ProtectedRoute.test.tsx`                 | Controle de acesso às páginas protegidas.                       |

**Limitação da evidência:** os testes unitários/de componente podem utilizar mocks. Isso verifica lógica isolada, **não substitui** um teste completo com frontend, backend, banco e envio de e-mail integrados.

## 5. Execução dos testes automatizados

Os comandos a seguir foram **confirmados nos `package.json` fornecidos**. O repositório utiliza `pnpm` (declarado no frontend e na raiz) e Vitest em ambas as aplicações.

### Backend (`backend/package.json`)

| Script       | Comando configurado                          | Finalidade                             |
| ------------ | -------------------------------------------- | -------------------------------------- |
| `test`       | `vitest run`                                 | Executar a suíte automatizada uma vez. |
| `test:watch` | `vitest`                                     | Executar testes em modo de observação. |
| `test:cov`   | `vitest run --coverage`                      | Executar os testes com cobertura.      |
| `test:e2e`   | `vitest run --config ./vitest.config.e2e.ts` | Executar a suíte E2E configurada.      |

Para reproduzir a execução padrão, a partir da pasta do backend:

```bash
pnpm test
```

Para executar especificamente a suíte E2E, quando o arquivo de configuração e os serviços exigidos estiverem disponíveis:

```bash
pnpm test:e2e
```

### Frontend (`app/package.json`)

| Script          | Comando configurado     | Finalidade                                                    |
| --------------- | ----------------------- | ------------------------------------------------------------- |
| `test`          | `vitest`                | Iniciar o Vitest (normalmente em modo interativo/observação). |
| `test:coverage` | `vitest run --coverage` | Executar testes uma vez, com cobertura.                       |

Para uma **execução única** da suíte, a partir da pasta do frontend:

```bash
pnpm test -- --run
```

Alternativamente, pode-se executar `pnpm exec vitest run`. Para executar com cobertura, usar `pnpm test:coverage`.

**Observação:** o `package.json` da raiz contém o script `prepare` para Husky, mas **não contém script `test`**. Portanto, os testes devem ser executados nas respectivas pastas de aplicação. Os comandos acima são reprodutíveis a partir dos scripts identificados, e não uma afirmação de quais comandos exatos foram digitados anteriormente pelo responsável.

### Registro dos resultados

| Categoria                       | Situação declarada                                                      | Quantidade de testes automatizados | Evidências                            |
| ------------------------------- | ----------------------------------------------------------------------- | ---------------------------------- | ------------------------------------- |
| Backend — testes automatizados  | **Aprovado**, conforme execução informada pelo responsável              | Contagem não fornecida             | Logs/relatórios opcionais a anexar    |
| Frontend — testes automatizados | **Aprovado**, conforme execução informada pelo responsável              | Contagem não fornecida             | Logs/relatórios opcionais a anexar    |
| Testes manuais — CT001 a CT018  | **18 cenários aprovados**, conforme execução informada pelo responsável | Não se aplica                      | Capturas/registros opcionais a anexar |

Não foram fornecidas a data exata de execução, a contagem individual de testes automatizados nem suas saídas de terminal. Esses dados não são presumidos neste documento.

## 6. Verificação da infraestrutura de desenvolvimento

Estes procedimentos são verificações técnicas adicionais, **não equivalem aos testes funcionais de autenticação**.

O `docker-compose.yml` enviado configura PostgreSQL e armazenamento compatível com S3 (MinIO). Os comandos de validação podem ser executados na pasta que contém esse arquivo:

```bash
docker compose config
docker compose up -d
docker compose ps
```

| ID     | Verificação                                                        | Resultado esperado                                                           | Status   |
| ------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- | -------- |
| INF001 | Validar sintaxe do Compose                                         | Configuração aceita sem erro.                                                | Aprovado |
| INF002 | Subir serviços                                                     | Contêineres iniciados.                                                       | Aprovado |
| INF003 | Inspecionar serviços                                               | PostgreSQL e serviço de armazenamento em execução.                           | Aprovado |
| INF004 | Verificar conectividade da API com PostgreSQL                      | API conecta ao banco configurado.                                            | Aprovado |
| INF005 | Verificar integração com serviço de e-mail no fluxo de recuperação | Código chega ao endereço de teste quando o serviço externo está configurado. | Aprovado |

**Segurança:** não inserir `.env`, tokens, senhas, códigos reais de recuperação ou conteúdo sensível nas evidências.

## 8. Conclusão

**Total de cenários funcionais documentados:** 18.  
**Cenários funcionais manuais executados:** 18, conforme declaração do responsável.  
**Cenários funcionais manuais aprovados:** 18, conforme declaração do responsável.  
**Cenários funcionais manuais reprovados:** 0 relatados.  
**Verificações de infraestrutura documentadas:** 5, todas registradas como aprovadas.  
**Testes automatizados de backend e frontend:** executados e aprovados, conforme declaração do responsável; contagem individual não informada.

Com base nos resultados relatados pelo responsável, **os testes da implementação de autenticação da Sprint 1 foram concluídos com sucesso**. Não houve nova execução independente durante a elaboração deste documento. Evidências adicionais podem ser anexadas para facilitar a avaliação da entrega.
