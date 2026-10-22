# Sprint 01 — Requisitos implementados

**Responsável:** Francisco Emilson Santos Souza Filho  
**Módulo:** Autenticação de usuários

## 1. Requisitos funcionais

### RF001 — Cadastro de usuário

Como visitante, eu posso me cadastrar no sistema, de modo que eu tenha acesso a uma conta.

**Prioridade:** Alta
**História relacionada:** US001

### RF002 — Login

Como usuário, eu posso entrar no sistema com e-mail e senha, de modo que eu acesse minha conta com segurança.

**Prioridade:** Alta  
**História relacionada:** US001

## 2. História de usuário — US001

**Cartão**

Como visitante, quero criar uma conta com nome, e-mail e senha e entrar no sistema com essas credenciais, para acessar o FullHouse com segurança.

**Conversa**

Na entrevista, André explicou que nome, e-mail e senha devem ser obrigatórios no cadastro, enquanto o endereço completo não é necessário nessa etapa, e que a forma de armazenar senhas e dados pessoais precisa seguir a LGPD.

**Confirmação — Critérios de aceitação**

- O cadastro deve exigir apenas nome, e-mail e senha, sem solicitar endereço ou documentos.
- Não deve ser possível criar duas contas com o mesmo e-mail.
- Ao informar e-mail ou senha incorretos, o acesso deve ser negado com uma mensagem de erro.

## 3. Funcionalidades complementares implementadas

Além dos requisitos explicitamente descritos na US001, foram desenvolvidas funcionalidades de apoio à autenticação:

- Encerramento de sessão (logout).
- Recuperação de senha mediante código de verificação.
- Redefinição de senha.
- Gerenciamento de sessões utilizando JWT.
- Proteção de rotas que exigem autenticação.

Essas funcionalidades complementam o módulo de autenticação, embora não possuam histórias de usuário específicas na especificação original.

## 4. Atividades técnicas complementares

A sprint também contemplou atividades de preparação da infraestrutura do projeto, incluindo:

- Definição e organização da arquitetura inicial.
- Instalação e configuração de bibliotecas.
- Configuração do ambiente de desenvolvimento.
- Integração com serviços externos.
- Configuração dos recursos necessários à execução do sistema.

O detalhamento dessas atividades será apresentado em `implementacao.md`.
