# Sprint 01 — Implementação

**Responsável:** Francisco Emilson Santos Souza Filho  
**Módulo principal:** Autenticação de usuários  
**Requisitos relacionados:** RF001 e RF002 — US001

## 1. Visão geral

Nesta sprint, foram desenvolvidos os fluxos de cadastro, login, encerramento de sessão e recuperação de senha, com implementação de interface (frontend) e regras de negócio/API (backend). Também foram preparados componentes de infraestrutura e configurações iniciais para viabilizar os módulos seguintes do sistema.

Esta documentação distingue **funcionalidades do módulo de autenticação** de **atividades técnicas de suporte**. A existência dos arquivos é comprovada pelos códigos analisados; o funcionamento ponta a ponta e a execução dos testes estão registrados separadamente em `testes.md`.

## 2. Frontend — autenticação

O frontend está organizado em páginas do Next.js, componentes reutilizáveis e módulo de integração HTTP.

| Recurso                    | Arquivo(s) principais                                                                                                               | Papel                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Login                      | `app/(auth)/login/page.tsx`; `features/auth/components/LoginForm.tsx`                                                               | Página e formulário de autenticação.                                |
| Cadastro                   | `app/(auth)/register/page.tsx`; `features/auth/components/RegisterForm.tsx`                                                         | Página e formulário de criação de conta.                            |
| Solicitação de recuperação | `app/(auth)/forgot-password/page.tsx`; `features/auth/components/ForgotPasswordForm.tsx`                                            | Solicitação de código de recuperação.                               |
| Verificação de código      | `app/(auth)/verify-email/page.tsx`; `features/auth/components/VerifyEmailForm.tsx`; `features/auth/components/OtpInput.tsx`         | Entrada e validação do código informado.                            |
| Nova senha                 | `app/(auth)/create-new-password/page.tsx`; `features/auth/components/CreateNewPasswordForm.tsx`                                     | Formulário de redefinição da senha.                                 |
| Confirmação da recuperação | `app/(auth)/password-success/page.tsx`                                                                                              | Apresentação do resultado do fluxo de redefinição.                  |
| Componentes de formulário  | `features/auth/components/PasswordField.tsx`; `features/auth/components/FormField.tsx`; `features/auth/components/SubmitButton.tsx` | Elementos compartilhados pelos fluxos de autenticação.              |
| Validação                  | `features/auth/components/schemas/`                                                                                                 | Esquemas de validação dos formulários.                              |
| Integração com a API       | `features/auth/api/auth.api.ts`; `app/services/api.ts`                                                                              | Operações HTTP e configuração base do cliente Axios.                |
| Estado da autenticação     | `providers/AuthProvider.tsx`; `features/auth/hooks/useAuth.ts`                                                                      | Recuperação do usuário autenticado, atualização de sessão e logout. |
| Proteção de páginas        | `components/auth/ProtectedRoute.tsx`; `app/(private)/layout.tsx`                                                                    | Estrutura de acesso a áreas privadas.                               |

O arquivo `features/auth/api/auth.api.ts` concentra as chamadas aos endpoints de cadastro, login, sessão, logout e recuperação de senha. O cliente Axios é criado em `app/services/api.ts`, com URL base definida por `NEXT_PUBLIC_API_URL`.

### 2.1. Fluxo de autenticação

1. O usuário preenche o formulário de login.
2. O frontend envia as credenciais à API.
3. O backend verifica a existência do usuário e a senha.
4. Em caso de sucesso, o backend define um cookie de autenticação e retorna os dados públicos do usuário.
5. O frontend consulta a sessão autenticada e controla a interface privada conforme o estado de autenticação.

### 2.2. Fluxo de recuperação de senha

1. Solicitação do código por e-mail.
2. Verificação do código recebido.
3. Definição de uma nova senha.
4. Exibição da tela de confirmação.

## 3. Backend — autenticação

O backend utiliza NestJS e organiza a lógica em controladores, serviços, módulos, DTOs, guardas e repositórios.

| Arquivo ou módulo                                                                                 | Responsabilidade                                               |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `src/auth/auth.controller.ts`                                                                     | Disponibilizar as rotas HTTP do módulo de autenticação.        |
| `src/auth/auth.service.ts`                                                                        | Executar as regras de cadastro, login e recuperação de senha.  |
| `src/auth/auth.module.ts`                                                                         | Configurar as dependências do módulo de autenticação.          |
| `src/auth/dto/`                                                                                   | Definir os dados esperados nas requisições.                    |
| `src/auth/jwt.strategy.ts`                                                                        | Estratégia de autenticação por JWT.                            |
| `src/auth/guards/jwt-auth-guard.ts`                                                               | Restringir acesso a endpoints autenticados.                    |
| `src/auth/decorators/current-user.decorator.ts`                                                   | Disponibilizar informações do usuário da sessão.               |
| `src/users/users.service.ts`; `src/users/users.repository.ts`                                     | Executar as operações de usuário usadas pelo cadastro e login. |
| `src/crypto/password.service.ts`                                                                  | Criar e comparar hashes de senha.                              |
| `src/password-reset/password-reset.service.ts`; `src/password-reset/password-reset.repository.ts` | Criar, verificar e consumir códigos de recuperação.            |
| `src/email/email.service.ts`                                                                      | Enviar e-mails necessários à recuperação de senha.             |

### 3.1. Endpoints identificados

| Método | Rota                      | Função                                    |
| ------ | ------------------------- | ----------------------------------------- |
| `POST` | `/auth/register`          | Cadastrar usuário.                        |
| `POST` | `/auth/login`             | Autenticar usuário.                       |
| `GET`  | `/auth/me`                | Consultar usuário autenticado; exige JWT. |
| `POST` | `/auth/logout`            | Encerrar a sessão, limpando o cookie.     |
| `POST` | `/auth/forgot-password`   | Solicitar código de recuperação.          |
| `POST` | `/auth/verify-reset-code` | Verificar código de recuperação.          |
| `POST` | `/auth/reset-password`    | Redefinir a senha.                        |

### 3.2. Tratamento de credenciais e sessões

- As senhas são comparadas utilizando o serviço de hashing em `src/crypto/password.service.ts`.
- O backend emite um JWT após cadastro/login e define o cookie `access_token` com `httpOnly` e `sameSite: "lax"`; o atributo `secure` é ativado quando `NODE_ENV` é `production`.
- No login, a opção _lembrar de mim_ altera o `maxAge` do cookie entre 1 dia e 30 dias.
- Credenciais inválidas são rejeitadas com mensagem genérica de e-mail ou senha incorretos.
- A solicitação de recuperação retorna a mesma mensagem independentemente da existência do e-mail, evitando revelar diretamente quais contas estão cadastradas.
- O serviço de recuperação gera código de seis dígitos com expiração de 15 minutos e marca o código como utilizado após a troca da senha.

## 4. Infraestrutura e preparação técnica

Esta seção registra a estrutura de suporte identificada nos arquivos enviados. **Não equivale a afirmar que todos os serviços foram executados e homologados nesta sprint.**

| Área                         | Arquivo(s) observado(s)                                           | Implementação/configuração identificada                                                                                    |
| ---------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Organização modular          | `src/app.module.ts`                                               | Registro de módulos da aplicação e suas dependências.                                                                      |
| Configuração de ambiente     | `src/app.module.ts`                                               | `ConfigModule` com esquema de validação Joi para variáveis obrigatórias.                                                   |
| Persistência                 | `src/prisma/prisma.module.ts`; `src/prisma/prisma.service.ts`     | Integração do backend com Prisma.                                                                                          |
| Armazenamento de arquivos    | `src/storage/storage.module.ts`; `src/storage/storage.service.ts` | Cliente S3 compatível com MinIO e método de upload.                                                                        |
| E-mail                       | `src/email/email.module.ts`; `src/email/email.service.ts`         | Serviço de envio de mensagens, utilizado na recuperação de senha.                                                          |
| Segurança HTTP               | `src/main.ts`                                                     | Cookie parser, CORS com origem configurável, verificação de origem para métodos de escrita e cabeçalhos HTTP de segurança. |
| Comunicação frontend/backend | `app/services/api.ts`; `features/auth/api/auth.api.ts`            | Cliente Axios e integração dos fluxos de autenticação.                                                                     |
| Reutilização de interface    | `features/auth/components/`; `components/form/`; `components/ui/` | Organização de componentes de interface e formulários.                                                                     |

**A confirmar no repositório:** o arquivo Docker Compose/definição do contêiner do MinIO, os manifests de dependências, as configurações de lint/formatador/hooks e eventuais scripts de inicialização. Esses itens foram mencionados na descrição do trabalho, mas não estavam disponíveis nos ZIPs analisados para referência exata de caminho.

## 5. Testes existentes no código

Os arquivos abaixo foram localizados, mas o resultado de suas execuções **não foi verificado nesta etapa**.

**Backend**

- `src/auth/auth.controller.spec.ts`
- `src/auth/auth.service.spec.ts`
- `src/auth/jwt.strategy.spec.ts`
- `src/crypto/password.service.spec.ts`
- `src/password-reset/password-reset.service.spec.ts`
- `src/password-reset/password-reset.repository.spec.ts`
- `src/email/email.service.spec.ts`
- `src/users/users.service.spec.ts`

**Frontend**

- `app/(auth)/login/__test__/page.test.tsx`
- `app/(auth)/register/__test__/page.test.tsx`
- `app/(auth)/forgot-password/__test__/page.test.tsx`
- `app/(auth)/verify-email/__test__/page.test.tsx`
- `app/(auth)/create-new-password/__test__/page.test.tsx`
- `features/auth/api/__test__/auth.api.test.ts`
- `features/auth/components/__test__/LoginForm.test.tsx`
- `features/auth/components/__test__/RegisterForm.test.tsx`
- `features/auth/components/schemas/__test__/schemas.test.ts`
- `providers/__test__/AuthProvider.test.tsx`
- `components/auth/__test__/ProtectedRoute.test.tsx`

O arquivo `testes.md` deverá registrar os **casos de teste funcionais**, os comandos de execução, os resultados obtidos e as evidências correspondentes. Também deverá verificar a integração real entre o frontend e o backend.

## 6. Rastreabilidade da entrega

| Item entregue                 | Requisito / enquadramento   | Evidência de implementação                                                     |
| ----------------------------- | --------------------------- | ------------------------------------------------------------------------------ |
| Cadastro                      | RF001 / US001               | Formulário frontend e `POST /auth/register`.                                   |
| Login                         | RF002 / US001               | Formulário frontend e `POST /auth/login`.                                      |
| Consulta e proteção de sessão | Suporte técnico ao RF002    | `GET /auth/me`, JWT, provider e componente de proteção.                        |
| Logout                        | Complementar à autenticação | `POST /auth/logout` e função frontend de logout.                               |
| Recuperação de senha          | Complementar à autenticação | Formulários, código de verificação, serviço de e-mail e endpoints específicos. |
| Infraestrutura básica         | Atividade técnica da sprint | Módulos, configurações, Prisma, MinIO e integração HTTP.                       |
