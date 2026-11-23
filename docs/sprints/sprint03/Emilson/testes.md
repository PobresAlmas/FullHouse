# Sprint 03 — Testes de Configurações da casa

**Responsável:** Emilson<br>
**Módulo:** Configurações da casa<br>
**OpenSpec:** [SPEC-003](../../../../openspec02/spec/003-configuracoes-da-casa/tasks.md)

## 1. Objetivo e estado da verificação

Conferir navegação, autorização, persistência de preferências, categorias e consulta de avisos. As suítes de interface, unitárias e de contrato usam dependências simuladas. O roteiro de navegador depende do ambiente local completo.

Na execução de 23/11/2026, passaram **44 testes web**, **59 unitários** e **14 HTTP** nos três comandos principais abaixo. As capturas de terminal e de navegador podem ser incluídas depois da execução local.

## 2. Matriz de testes funcionais

| ID   | Cenário                                   | Resultado esperado                                                               | Referência      |
| ---- | ----------------------------------------- | -------------------------------------------------------------------------------- | --------------- |
| CT01 | Abrir Casa e salvar o nome como gestor    | A tela mostra dados da casa e atualiza o nome na navegação.                      | CA01–CA04       |
| CT02 | Alterar o acesso individual               | O papel de gestão é preservado e a API aplica a alteração ao morador elegível.   | CA05–CA06       |
| CT03 | Criar, renomear e excluir uma categoria   | A lista é atualizada. A categoria em uso fica protegida.                         | CA07            |
| CT04 | Salvar uma preferência e mudar de tema    | A consulta volta com a opção salva e o navegador reaplica o tema selecionado.    | CA08–CA09, CA11 |
| CT05 | Consultar notificações e marcar como lida | O estado muda para a conta autenticada e o filtro de leitura reflete o registro. | CA10            |

## 3. Arquivos de teste

| Suíte            | Arquivos                                                                                                                                                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend         | [Configurações](../../../../web/features/settings/components/__test__/SettingsPage.test.tsx), [notificações](../../../../web/features/notifications/) e [cabeçalho e navegação](../../../../web/components/layout/__test__/). |
| Backend unitário | [Residências](../../../../backend/src/residences/), [notificações](../../../../backend/src/notifications/) e [categorias da despensa](../../../../backend/test/unit/pantry/pantry-categories.spec.ts).                        |
| Backend HTTP     | [Residências](../../../../backend/test/residences.e2e-spec.ts) e [Despensa](../../../../backend/test/pantry.e2e-spec.ts).                                                                                                     |

## 4. Comandos para executar os testes

Execute os comandos na raiz do FullHouse. Use Node.js 26.8.1, a versão do [Devbox](../../../../devbox.json). Caso use nvm no Bash, ative com `nvm use 26.8.1` antes de rodar os testes. Se for o primeiro uso, instale as dependências e gere o Prisma Client conforme o [README](../../../../README.md#subir-localmente).

### Frontend — `testes-front.png`

```bash
pnpm --dir web exec vitest run features/settings features/notifications components/layout
```

### Backend unitário — `testes-backend.png`

```bash
pnpm --dir backend exec vitest run src/residences src/notifications test/unit/pantry/pantry-categories.spec.ts
```

### Backend HTTP — `testes-backend-e2e.png`

```bash
pnpm --dir backend run test:e2e test/residences.e2e-spec.ts test/pantry.e2e-spec.ts
```

A revisão da SPEC-004 atualizou a suíte HTTP de Notificações para o contrato paginado. Os três testes dessa suíte passaram. Os comandos e a execução de Quartos estão no [registro de negociação e convites](negociacao-e-convites/testes.md). A [paginação da negociação](paginacao-da-negociacao/testes.md) tem comandos focados próprios.

## 5. Roteiro de teste manual e evidências

Inicie o [ambiente local](../../../../README.md#subir-localmente) e use uma conta gestora e uma conta de morador da mesma casa. Salve as imagens no diretório [`evidencias/`](evidencias/).

| Captura                          | Passos                                                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `configuracoes-casa.png`         | Abra **Configurações → Casa**, atualize o nome como gestor e capture a tela com o novo nome.                                                |
| `configuracoes-permissoes.png`   | Abra **Permissões**, altere o acesso de um morador elegível e recarregue para conferir o valor salvo.                                       |
| `configuracoes-categorias.png`   | Abra **Preferências → Categorias**, crie uma categoria de teste e confirme que ela aparece na lista.                                        |
| `configuracoes-preferencias.png` | Abra **Preferências → Despensa**, salve uma mudança e recarregue. Em **Geral**, selecione **Escuro** para conferir a aparência, se desejar. |
| `configuracoes-notificacoes.png` | Abra **Notificações** em uma conta que recebeu um convite ou outro aviso. Alterne o filtro e marque um aviso como lido.                     |
