# Segurança e cobertura de testes — Sprint 3

## Correções de segurança incluídas

### Autorização residencial — `e1abb9f`

- A política padrão para criação e edição de conteúdo de uma residência passa a ser `LIDERES` quando não há configuração salva.
- A checagem `requireCreateEditPermission` é aplicada a avisos da casa e às operações da lista de compras.
- As respostas e telas usam a permissão efetiva do morador para decidir quais ações ficam disponíveis.
- A aplicação usa `LIDERES` como política padrão quando a residência não tem configuração salva. A migração e o schema do banco foram omitidos deste recorte.

Arquivos principais neste pacote: `seguranca-autorizacao/backend/src/residences/residence-access.service.ts`, `seguranca-autorizacao/backend/src/home/home.service.ts` e `seguranca-autorizacao/backend/src/shopping-list/shopping-list.service.ts`.

### Proteção de autenticação — `ca13301` e `a73a6c9`

- Após cinco senhas inválidas, a conta recebe bloqueio temporário de 15 minutos; login válido limpa o contador.
- Tentativas com bloqueio ainda ativo retornam uma resposta genérica de credenciais inválidas.
- O guard global limita as requisições a 120 por minuto.
- Foram adicionados testes unitários de serviço, repositório e composição do módulo. Testes HTTP e de migração ficaram fora deste recorte.

Arquivos principais neste pacote: `seguranca-autenticacao/backend/src/auth/auth.service.ts`, `seguranca-autenticacao/backend/src/users/users.repository.ts` e `seguranca-autenticacao/backend/src/common/app-throttling.ts`.

## Testes unitários

O recorte `cobertura-testes-unitarios/` reúne os testes alterados na revisão `f2da42d`, sem os testes HTTP/e2e e de integração dessa revisão. Inclui casos de autenticação, recuperação de senha, quartos, tarefas e trocas, além de clientes e componentes web de despesas, pets, residências e tarefas.

O relatório do projeto de 15/11/2026 registrou 375 testes backend em 50 arquivos e 208 testes frontend em 64 arquivos. Na medição ampla, o backend marcou 76,40% de linhas e 58,03% de branches; o frontend marcou 64,37% de linhas e 54,73% de branches. São números globais do repositório e não devem ser apresentados como cobertura apenas dos arquivos deste pacote.
