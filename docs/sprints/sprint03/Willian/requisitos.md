# Sprint 03 — Requisitos implementados: Correções de autenticação, privacidade e tarefas

**Responsável:** Antonio Willian Silva Oliveira<br>
**Módulos:** Autenticação, moradores da residência e tarefas<br>
**Tipo de entrega:** Correção de defeitos e testes de regressão

## 1. Problemas tratados

- Os campos de e-mail de login e cadastro declaravam `type="email"`, mas o componente genérico não encaminhava essa propriedade ao `<input>`. O navegador os interpretava como campos de texto, sem teclado de e-mail em dispositivos móveis nem validação nativa.
- A verificação de recuperação não informava quando a API retornava `valid: false`. O e-mail também era interpolado sem codificação na URL, podendo corromper aliases com `+`.
- A listagem de moradores deve limitar dados pessoais ao necessário e mostrar e-mail somente quando autorizado.
- Algumas mensagens de validação e de negócio de tarefas continham caracteres corrompidos em português.

## 2. Critérios de aceitação

- `FormTextField` encaminha o tipo declarado para o campo HTML, incluindo `email` nos formulários que o solicitam.
- Código de recuperação inválido ou expirado gera mensagem visível para a pessoa usuária.
- Os parâmetros de e-mail e código são codificados ao montar as URLs dos fluxos de recuperação, preservando endereços com `+`.
- As rotas de moradores exigem vínculo ativo e não retornam e-mails quando o endpoint não tem autorização para divulgá-los.
- Mensagens de erro das tarefas exibem acentos corretamente.
- Testes de regressão cobrem os comportamentos corrigidos.

## 3. Observação sobre privacidade nesta cópia do repositório

Os caminhos citados no relato (`SettingsMembersTable.tsx` e `openspec02/spec/003-configuracoes-da-casa/requirements.md`) não existem nesta cópia. As rotas disponíveis para moradores de pets, tarefas e despensa já verificam o vínculo ativo e retornam nomes/funções, sem e-mail. Foi incluída uma regressão no endpoint de moradores de pets para garantir que o e-mail continue ausente da resposta, mesmo se existir no registro carregado.
