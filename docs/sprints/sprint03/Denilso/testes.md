# Sprint 03 — Testes de Anunciar quarto

**Responsável:** Denilso<br>
**Módulo:** Quartos — publicação, gestão e interesses em Moradores<br>
**OpenSpec:** [SPEC-001](../../../../openspec02/spec/001-anunciar-quarto/tasks.md)

## 1. Objetivo e estado da verificação

Conferir a publicação em Moradores, a validação de campos e fotos, a privacidade do anúncio, a gestão de interesses e a entrada do convidado. As suítes de interface, unitárias e de contrato usam dependências simuladas. O roteiro manual usa a aplicação completa e duas contas de teste.

Na execução de 23/11/2026, passaram **88 testes web**, **99 unitários**, **14 HTTP** e **2 de integração de migrações** em PostgreSQL descartável. As capturas de terminal podem ser incluídas depois da execução local.

## 2. Matriz de testes funcionais

| ID   | Cenário                           | Resultado esperado                                                                                                          | Referência            |
| ---- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| CT01 | Abrir o formulário como gestor    | A ação aparece em Moradores e identifica a casa. Um morador comum não pode publicar.                                        | CA01–CA02, CA07       |
| CT02 | Selecionar foto e revisar regras  | Formatos, tamanho e quantidade são validados. As fotos válidas podem ser removidas antes de publicar e o texto é revisável. | CA03–CA04             |
| CT03 | Publicar e conferir a privacidade | O card aparece na casa. A consulta pública respeita as opções de endereço e contato.                                        | CA05–CA06, CA09, CA13 |
| CT04 | Editar e responder ao interesse   | Apenas o anunciante tem as ações de gestão. A solicitação gera um aviso cujo link abre os interessados.                     | CA09–CA11             |
| CT05 | Aceitar o convite                 | A conta destinatária passa a morar na casa e abre a Home da residência. A recusa preserva a situação anterior.              | CA12                  |
| CT06 | Usar teclado em tela estreita     | O formulário cabe na tela e devolve o foco ao acionador após cancelar.                                                      | CA08                  |

## 3. Arquivos de teste

| Suíte                 | Arquivos                                                                                                                                                                                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend              | [Moradores e anúncios](../../../../web/features/settings/components/__test__/SettingsPage.test.tsx), [Quartos e negociação](../../../../web/features/rooms/components/__test__/), [sino](../../../../web/features/notifications/components/__test__/NotificationBell.test.tsx) e [Home](../../../../web/features/home/components/__test__/HomePage.test.tsx). |
| Backend unitário      | [Quartos](../../../../backend/src/rooms/), [notificações](../../../../backend/src/notifications/) e [armazenamento](../../../../backend/src/storage/storage.service.spec.ts).                                                                                                                                                                                 |
| Backend HTTP          | [Quartos](../../../../backend/test/rooms.e2e-spec.ts).                                                                                                                                                                                                                                                                                                        |
| Integração PostgreSQL | [Migração de anúncios](../../../../backend/test/integration/room-listings-migration.integration.test.ts) e [migração de negociação](../../../../backend/test/integration/room-negotiations-migration.integration.test.ts).                                                                                                                                    |

## 4. Comandos para executar os testes

Execute os comandos na raiz do FullHouse. Use Node.js 26.8.1, a versão do [Devbox](../../../../devbox.json). Caso use nvm no Bash, ative com `nvm use 26.8.1` antes de rodar os testes. Se for o primeiro uso, instale as dependências e gere o Prisma Client conforme o [README](../../../../README.md#subir-localmente).

### Frontend — `testes-front.png`

```bash
pnpm --dir web exec vitest run features/settings features/rooms features/notifications features/home app/rooms components/layout "app/(private)/rules"
```

### Backend unitário — `testes-backend.png`

```bash
pnpm --dir backend exec vitest run src/rooms src/notifications src/storage/storage.service.spec.ts
```

### Backend HTTP — `testes-backend-e2e.png`

```bash
pnpm --dir backend run test:e2e test/rooms.e2e-spec.ts
```

### Integração PostgreSQL (opcional) — `testes-integracao-postgres.png`

Com `TEST_DATABASE_URL` apontando para um banco descartável de testes:

```bash
pnpm --dir backend exec vitest run --config vitest.config.integration.ts test/integration/room-listings-migration.integration.test.ts test/integration/room-negotiations-migration.integration.test.ts
```

## 5. Roteiro de teste manual e evidências

Inicie o [ambiente local](../../../../README.md#subir-localmente). Para testar fotos, prepare o bucket de armazenamento descrito no README. Use uma conta gestora da casa e uma conta interessada sem residência ativa, em sessões separadas. Salve as novas imagens em [`evidencias/`](evidencias/).

| Captura                  | Passos                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `anuncio-moradores.png`  | Com a gestão, abra **Configurações → Moradores** e capture a ação **Anunciar quarto** e a seção **Anúncios da casa**.                      |
| `anuncio-formulario.png` | Preencha o formulário, selecione uma foto e revise as regras de convivência, pets e opções de privacidade.                                 |
| `anuncio-publicado.png`  | Publique e capture a confirmação e o card em Moradores. Abra a prévia para verificar os campos públicos.                                   |
| `anuncio-interesse.png`  | Com a outra conta, abra **Quartos** e envie o interesse. Volte à conta gestora, abra o aviso do sino e capture os interessados no anúncio. |
| `anuncio-convite.png`    | Aceite o interesse, abra a conversa e envie o convite. Na outra sessão, aceite o convite e capture a Home com a residência reconhecida.    |
| `anuncio-mobile.png`     | Abra o formulário em tela estreita e capture o layout com os campos e ações acessíveis.                                                    |

A OpenSpec já contém as capturas da [aba Moradores](../../../../openspec02/spec/001-anunciar-quarto/evidencias/01-moradores-desktop.png), do [formulário](../../../../openspec02/spec/001-anunciar-quarto/evidencias/02-formulario-desktop.png), do [anúncio publicado](../../../../openspec02/spec/001-anunciar-quarto/evidencias/03-publicado.png) e da [versão móvel](../../../../openspec02/spec/001-anunciar-quarto/evidencias/04-formulario-celular.png).

Os comandos e as capturas de Casa, Pessoal e trocas estão no [registro de testes da SPEC-006](contextos-home-tarefas/testes.md).
