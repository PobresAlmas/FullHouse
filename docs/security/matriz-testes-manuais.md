# Matriz de testes manuais de segurança

Use este roteiro em uma instância local ou de homologação com dados descartáveis. Os casos verificam autenticação, autorização entre usuários e casas, validação de entrada e controles HTTP. Não rode tentativas de senha em contas reais nem faça flood; o caso de limite de login usa somente 21 requisições ao longo de uma janela.

## Preparação

### Contas e casas

Em um banco descartável vazio, o seed de demonstração cria três contas e uma casa compartilhada:

| Identificação | Conta do seed | Papel na Casa A | Uso nos testes |
|---|---|---|---|
| U1 | `demo@example.com` | Líder | Dono da Casa A e única pessoa da Casa B |
| U2 | `ana@example.com` | Moradora | Membro da Casa A; deve ficar fora da Casa B |
| U3 | `bruno@example.com` | Morador | Membro da Casa A; deve ficar fora da Casa B |

As três contas recém-criadas usam a senha definida por `DEMO_USER_PASSWORD` no ambiente local. O seed não redefine a senha se essas contas já existirem. Em um checkout já configurado com `backend/.env`, execute da raiz do projeto:

```bash
SEED_DEMO_DATA=1 pnpm --dir backend exec node --env-file=.env prisma/seed.mjs
```

O comando usa `DATABASE_URL` e `DEMO_USER_PASSWORD` desse `.env`; a senha precisa ter pelo menos 8 caracteres. Aponte para um banco descartável. O seed não deve ser executado em produção.

Entre como U1 e crie uma segunda residência chamada `MT Casa B Isolada`. Deixe U2 e U3 sem participação nela. Anote os UUIDs das casas em **Casa A** e **Casa B** abaixo. Se o ambiente já tiver os registros do seed, não é necessário rodá-lo novamente.

| Dado | Valor para preencher |
|---|---|
| URL da API | `http://localhost:3000` (ou URL da homologação) |
| URL web | `http://localhost:3001` (ou URL da homologação) |
| UUID Casa A | |
| UUID Casa B | |
| UUID pet de teste na Casa A | |
| UUID pet de teste na Casa B | |
| UUID item privado de U1 na Casa A | |
| UUID tarefa de U1 na Casa A | |
| UUID despesa da Casa A | |
| Data / responsável pela execução | |

Crie registros com nomes únicos, por exemplo `MT-PET-CASA-A`, `MT-PET-CASA-B`, `MT-PRIVADO-U1`, `MT-TAREFA-U1` e `MT-DESPESA-A`. Para obter os UUIDs, use a resposta da aplicação ou o painel de rede do navegador. Não use dados pessoais reais.

### Valores concretos para preencher

Estes são valores de uma fixture de teste local. **Eles ainda não são contas ativas**: o PostgreSQL local está indisponível neste momento. Em um banco de teste novo, defina esta senha em `backend/.env` antes de executar o seed:

```dotenv
DEMO_USER_PASSWORD=FullHouseQA2026!
```

O seed cria estas contas com a mesma senha, uma casa compartilhada e os registros de despensa descritos no próprio seed. Se as contas já existirem, o seed não troca as senhas. Depois de carregar o seed, entre com U1 e crie a Casa B pela tela inicial. Os UUIDs são gerados pelo banco; copie cada um da interface ou do painel de rede para os campos da preparação.

| Usuário | Login | Senha de teste | Acesso esperado |
|---|---|---|---|
| U1 — Emilson Silva | `demo@example.com` | `FullHouseQA2026!` | Líder da Casa A; criar também a Casa B |
| U2 — Ana Souza | `ana@example.com` | `FullHouseQA2026!` | Moradora da Casa A; sem acesso à Casa B |
| U3 — Bruno Lima | `bruno@example.com` | `FullHouseQA2026!` | Morador da Casa A; sem acesso à Casa B |

| Casa | Nome exato | Membros | Dado de referência |
|---|---|---|---|
| Casa A | `Casa de demonstração` | U1 líder; U2 e U3 moradores | Criada pelo seed; use para testar acesso permitido entre moradores |
| Casa B | `MT Casa B Isolada` | Somente U1 | Crie na página inicial como U1; use para testar isolamento contra U2 e U3 |

Depois de criar Casa B, cadastre estes registros pela aplicação. Use a seção/casa indicada no seletor da própria página:

| Casa | Seção | Nome / descrição | Valores dos campos |
|---|---|---|---|
| Casa A | Pets | `MT-Pet-Rex-A` | Espécie: `Cachorro`; raça: `SRD`; nascimento: `2021-04-12` |
| Casa B | Pets | `MT-Pet-Luna-B` | Espécie: `Gato`; raça: `Siamês`; nascimento: `2022-07-19` |
| Casa A | Cuidado do Rex | `MT-Vacina-V10-Rex` | Tipo: vacina; data: `2026-10-20`; valor: `89,90`; pagador: U1 |
| Casa A | Despensa | `MT-Ração-Privada-U1` | Crie a categoria `MT-Pets`; propriedade: privada; unidade: pacote; quantidade: `2`; mínimo: `1` |
| Casa A | Tarefa | `MT-Levar-Rex-ao-veterinário` | Responsável: U1; vencimento: `2026-12-05 18:00` |
| Casa A | Despesa | `MT-Veterinário-Rex` | Valor: `180,50`; vencimento: `2026-12-01`; status: pendente |
| Casa B | Despesa | `MT-Ração-Luna` | Valor: `79,90`; vencimento: `2026-12-05`; status: pendente |

Use U2 para tentar abrir/alterar os registros da Casa B. O acesso deve ser recusado e os registros devem continuar iguais. Para o caso de tarefa, use U2 para tentar concluir `MT-Levar-Rex-ao-veterinário`; como ela está atribuída a U1, a conclusão deve ser recusada. Os nomes `MT-` identificam dados descartáveis para você não confundir com registros reais.

### Como registrar

Faça login de cada usuário em perfis de navegador separados para não misturar cookies. Para cada caso, anote o usuário ativo, método e caminho, status HTTP, se algum dado mudou e uma captura da tela ou resposta com dados sensíveis ocultados. Faça mutações pela interface ou envie a origem configurada (`http://localhost:3001` por padrão); sem `Origin`/`Referer` válido, o middleware recusa a requisição antes dos casos de autenticação/autorização.

Marque o resultado como `OK`, `Falhou` ou `N/E`. Um status diferente do esperado, dado de outra casa aparecendo, ou uma mutação concluída por usuário sem permissão é falha. Em casos de bloqueio, confirme também que o registro original permaneceu intacto.

| ID | Resultado | Evidência / observação |
|---|---|---|
| A01–A07 | | |
| I01–I06 | | |
| D01–D05 | | |
| V01–V05 | | |

## A. Login, sessão e senha

| ID | Teste / ator | Passos | Resultado esperado |
|---|---|---|---|
| A01 | Rota protegida sem sessão | Sem cookie, acessar `GET /auth/me`, `GET /residences` e `GET /residences/{casaA}/pets`. | Todos respondem `401` ou `403`; nenhum dado privado é retornado. |
| A02 | Login válido e resposta | Como U1, enviar `POST /auth/login` com e-mail e senha corretos; conferir corpo e cookie no DevTools. | Login permitido; corpo não contém senha, hash ou token; cookie `access_token` é `HttpOnly` e `SameSite=Lax`. Em produção, também deve ter `Secure`. |
| A03 | Credenciais inválidas | Enviar login com senha incorreta e depois com e-mail inexistente. | Ambos negados com `401` e mensagem genérica equivalente; a resposta não confirma se o e-mail está cadastrado. |
| A04 | Cadastro e validação de senha | Em ambiente descartável, tentar cadastrar e-mail repetido, e-mail inválido, senha com menos de 8 caracteres e corpo com campo inesperado como `papel`. | Entradas inválidas/repetidas são rejeitadas (`400` ou `409` conforme o caso); campo `papel` não cria privilégio nem é aceito. A resposta nunca devolve senha/hash. |
| A05 | Encerramento da sessão | Como U1, chamar `POST /auth/logout`; olhar o `Set-Cookie` e tentar `GET /auth/me` usando o cookie atualizado. | Cookie é removido/expirado e a chamada seguinte fica sem autenticação. Registre separadamente se uma cópia antiga do token ainda funcionar. |
| A06 | Recuperação e limite de tentativas | Em ambiente com e-mail de teste, comparar `POST /auth/forgot-password` para conta existente e inexistente. Depois faça até 21 tentativas de login inválido em uma única janela de 60 segundos, somente com U1. | Recuperação apresenta a mesma mensagem para os dois e-mails. No login, o limite documentado no controlador deve bloquear novas tentativas com `429`; não continue após o bloqueio. Não use caixa postal real sem intenção de enviar mensagens. |
| A07 | Código de recuperação e troca de senha | Somente com e-mail de teste: solicitar código, verificar um código errado e o válido em `POST /auth/verify-reset-code`, então trocar a senha em `POST /auth/reset-password`. | Código incorreto/expirado é recusado; código válido permite a troca. Após a troca, a senha antiga falha e a nova funciona. Não registre código ou senha na evidência. |

## B. Isolamento entre casas e permissões

| ID | Teste / ator | Passos | Resultado esperado |
|---|---|---|---|
| I01 | Enumeração das casas | Como U1 e depois U2, chamar `GET /residences`. | U1 vê Casa A e Casa B; U2 vê apenas Casa A. Nenhum registro de Casa B aparece para U2. |
| I02 | Acesso direto a outra casa | Como U2 e U3, substituir o UUID em `GET /residences/{casaB}/pets`, `GET /residences/{casaB}/pantry/items` e `GET /residences/{casaB}/tasks`. | Acesso negado (`404` ou `403`) e sem dados da Casa B. A API atualmente oculta residência indisponível com `404`. |
| I03 | Pet por UUID de outra casa | Como U2, abrir `GET /residences/{casaB}/pets/{petB}` e tentar `PATCH` e `DELETE` nessa rota. Também tente `GET /pets/{petB}/care-logs`. Como segundo controle, tente usar `petB` no caminho da Casa A. | Leitura e mutações negadas (`404` ou `403`); pet e registros de cuidado continuam iguais. Repita com `petA` na Casa A para confirmar o controle positivo de acesso. |
| I04 | Referências de outra casa | Como U1, criar em `POST /pets/{petB}/care-logs` um registro que indique `paidById` de U2 na Casa A ou `expenseId` de uma despesa da Casa A. Se a interface não expuser esses campos, use o painel de rede em ambiente de teste. | Referência rejeitada (`400`); não deve gravar associação entre casas nem criar o registro de cuidado. |
| I05 | Configuração de permissões | Anote a política atual. Como U1, configurar Casa A para `LIDERES`. Como U2, tentar `PATCH /residences/{casaA}/settings/permissions` e tentar criar/editar pet, tarefa ou categoria da despensa. Depois restaure a política original como U1. | U2 não altera a configuração (`403`) e não cria/edita conteúdo sujeito à política (`403`). Leituras permitidas continuam disponíveis. A política original é restaurada ao final. |
| I06 | Campos de papel e atribuição | Como U2, enviar em um `POST` ou `PATCH` de pet/tarefa campos extras como `createdById`, `residenceId`, `role` ou `ownerMemberId` apontando para U1. | Campo desconhecido é rejeitado (`400`) ou o servidor ignora valores calculados pelo cliente; nenhum registro passa a pertencer a U1/à outra casa por adulteração do corpo. |

## C. Dados de usuário e registros da casa

| ID | Teste / ator | Passos | Resultado esperado |
|---|---|---|---|
| D01 | Listagem global de usuários | Com U2 autenticado, chamar `GET /users` e observar apenas nomes de campos e quantidade de registros; não copie valores de hash para evidências. | Um usuário comum não deve receber lista global nem campos privados de outros usuários. **Risco conhecido ao revisar o código:** a rota chama uma consulta sem filtro nem seleção de campos e pode expor todos os registros, inclusive `senha_hash`. Se isso aparecer, interrompa a inspeção do conteúdo, registre como falha de alta prioridade e proteja/oculte a evidência. |
| D02 | Item privado da despensa | Como U1, criar item `PRIVADO` na Casa A. Como U2, consultar `GET /residences/{casaA}/pantry/items` e, se souber o UUID, tentar `PATCH`, `DELETE` e criar movimentação para ele. | Item privado não aparece para U2; acesso direto ou alteração são negados (`404`/`403`) e quantidade/dados não mudam. |
| D03 | Despesa e tarefa de outra casa | Como U2, confirmar que `GET /expenses` não lista despesa da Casa B; tentar `PUT /expenses/{expenseB}` e `DELETE /expenses/{expenseB}`, acessar tarefa com o UUID de Casa B e enviar `POST /expenses` com `homeId` da Casa B. | Operações negadas (`404`/`403`); nada é criado, editado ou removido na Casa B. |
| D04 | Conclusão por pessoa não responsável | Crie na Casa A uma tarefa atribuída a U1. Como U2, chamar `PATCH /residences/{casaA}/tasks/{taskId}/complete`. | Operação é recusada e tarefa permanece aberta. Líderes/administradores podem ter permissão; moradores só concluem tarefa atribuída a eles. |
| D05 | Exclusão e autorização de pet | Como U2, tentar `DELETE /residences/{casaA}/pets/{petA}`; depois faça a mesma operação com U1 somente se estiver pronto para apagar o registro descartável. | Morador não administrador não exclui o pet (`403`). Líder/administrador pode; confirme a exclusão apenas em registro marcado `MT-`. |

## D. Validação, origem e cabeçalhos

| ID | Teste / ator | Passos | Resultado esperado |
|---|---|---|---|
| V01 | UUID malformado | Substituir `residenceId`, `petId` ou `taskId` por `abc` em uma rota protegida. | Requisição rejeitada com `400`; sem stack trace, consulta indevida ou alteração. |
| V02 | Origem não permitida | Com sessão de teste, enviar uma mutação usando `Origin: https://origem-invalida.example`. Repetir sem `Origin` e sem `Referer`. | Ambas são recusadas com `403`; a origem configurada para a aplicação continua funcionando. |
| V03 | CORS com credenciais | Inspecionar preflight e resposta da API a partir do front configurado e de uma origem diferente. | Somente a origem configurada recebe permissão CORS com credenciais; não deve haver `Access-Control-Allow-Origin: *` combinado com credenciais. |
| V04 | Cabeçalhos de segurança | Inspecionar uma resposta da API e confirmar presença dos cabeçalhos emitidos pelo Helmet, incluindo `X-Content-Type-Options` e políticas de frame/referrer. | Cabeçalhos de segurança presentes; nenhuma informação de versão ou stack trace desnecessária em erros. |
| V05 | Upload de avatar | Como conta de teste, tentar enviar arquivo de tipo não permitido e arquivo maior que 5 MB para `POST /users/me/avatar`; em seguida enviar imagem pequena válida. | Tipos inválidos e arquivos acima de 5 MB são rejeitados; arquivo válido só altera o avatar da conta autenticada. |

## Registro de falha

Para cada falha, guarde: ID do caso, data, usuário de teste, método/caminho, status HTTP, resultado esperado e observado, UUIDs fictícios envolvidos, impacto e evidência redigida. Nunca inclua senhas, cookies, tokens, códigos de recuperação ou hashes completos. Antes de repetir mutações, confira o estado do registro para evitar perda de dados de teste.

## Referências das rotas verificadas

- Autenticação: `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/forgot-password`, `/auth/verify-reset-code` e `/auth/reset-password`.
- Residências: `/residences` e `/residences/{residenceId}/settings/permissions`.
- Pets e cuidados: `/residences/{residenceId}/pets` e `/pets/{petId}/care-logs`.
- Despensa: `/residences/{residenceId}/pantry/...`.
- Tarefas: `/residences/{residenceId}/tasks/...`.
- Despesas: `/expenses`.
- Usuários/avatar: `/users` e `/users/me/avatar`.
