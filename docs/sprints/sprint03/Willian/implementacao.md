# Sprint 03 — Implementação das correções de autenticação, privacidade e tarefas

**Responsável:** Antonio Willian Silva Oliveira<br>
**Módulos principais:** Autenticação, moradores da residência e tarefas

## 1. Frontend

| Arquivo                                                             | Ajuste                                                                                                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `web/components/form/FormTextField.tsx`                             | Encaminha `type` para `TextField`, preservando tipos como `email` nos formulários de login e cadastro.                                     |
| `web/features/auth/components/ForgotPasswordForm.tsx`               | Usa `URLSearchParams` para preservar aliases com `+` e exibe falhas sem navegar quando a API não envia o código.                           |
| `web/features/auth/components/VerifyEmailForm.tsx`                  | Exibe mensagem para código inválido/expirado, trata a ausência de e-mail e codifica e-mail e código antes de abrir a redefinição de senha. |
| `web/components/form/__test__/FormTextField.test.tsx`               | Verifica a propagação do tipo `email`.                                                                                                     |
| `web/features/auth/components/__test__/ForgotPasswordForm.test.tsx` | Verifica a codificação do e-mail com `+` na URL de verificação.                                                                            |
| `web/features/auth/components/__test__/VerifyEmailForm.test.tsx`    | Verifica a mensagem de código inválido e a preservação do alias ao abrir a criação de senha.                                               |

## 2. Backend

| Arquivo                                          | Ajuste                                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `backend/src/tasks/dto/create-task.dto.ts`       | Corrige a codificação das mensagens de validação de título, descrição, responsável, data e frequência. |
| `backend/src/tasks/tasks.service.ts`             | Corrige os textos de exceções de recorrência, edição, conclusão e vínculo do responsável.              |
| `backend/src/tasks/dto/tasks-validation.spec.ts` | Confere as mensagens em português retornadas pela validação.                                           |
| `backend/src/pets/pets.service.spec.ts`          | Confere que a listagem de moradores exige vínculo ativo e não expõe o e-mail.                          |
| `backend/src/app.module.spec.ts`                 | Define configuração de teste antes de importar `AppModule`, sem depender do `.env` local.              |

## 3. Privacidade de moradores

Os endpoints atuais de moradores em pets, tarefas e despensa validam o vínculo ativo antes de consultar moradores. Os repositórios selecionam nomes/apelidos e as respostas não mapeiam e-mails. Como a tabela de configurações indicada no relato não existe nesta cópia, o ajuste correspondente foi coberto no endpoint de moradores disponível, sem inventar uma tela ou caminho inexistente.
