e# SPEC-001 — Design

**Estado:** publicação, gestão de anúncios e interesses implementadas.

## Dependências

- A rota [`/settings?section=members`](../../../web/app/%28private%29/settings/page.tsx) renderiza `SettingsPage`. A página conhece a residência exibida e o papel do usuário, e usa `SettingsMembersTable` para apresentar o cartão **Moradores da casa**.
- A feature [`rooms`](../../../web/features/rooms/) já tem formulário em `RoomsPage`, tipos `RoomListingInput` e `RoomListing`, funções de upload e criação e o módulo [`backend/src/rooms`](../../../backend/src/rooms/).
- O cliente [`house-rules.api.ts`](../../../web/features/house-collaboration/api/house-rules.api.ts) consulta as regras vigentes da residência. A API atual limita essa leitura aos membros ativos.
- A rota `/rooms` direciona moradores com residência ativa para a página inicial. O formulário de publicação em Moradores deve abrir no contexto de Configurações e reutilizar a feature de Quartos por meio dos seus componentes e contratos.

## Fluxo principal

`Configurações → Moradores → Anunciar quarto → preencher e revisar → enviar fotos → publicar → confirmar em Moradores`.

1. `SettingsPage` oferece a ação quando a seção é `members`, a residência está confirmada e o usuário é gestor. Ao abrir, captura o ID, o nome, a cidade e o bairro da residência, vinculando o formulário a esse contexto.
2. O formulário carrega o mural vigente da casa. O anunciante preenche os dados, seleciona fotos, escolhe as regras que deseja aproveitar e confere o texto público e as opções de privacidade.
3. A submissão valida todos os campos e arquivos antes de iniciar os uploads. Durante o envio, o formulário indica progresso e desabilita ações que possam iniciar outra publicação.
4. A aplicação envia as fotos pela API existente e usa somente as URLs confirmadas no payload de criação. Após o sucesso, fecha o diálogo, retorna o foco ao botão e exibe **Anúncio publicado** em Moradores.

## Fluxos alternativos

- **Residência ou papel indisponível:** durante a verificação de acesso, aguardar o contexto da residência. Se a sessão ou a elegibilidade mudar com o formulário aberto, invalidar a ação e informar que a casa ou o acesso mudou. Ignorar respostas antigas que pertençam a outro contexto.
- **Mural vazio:** mostrar que ainda não há regras registradas e manter o campo de convivência disponível. **Falha ao consultar:** mostrar a falha e oferecer nova tentativa sem limpar o texto já informado. O preenchimento manual continua disponível quando a sessão e a permissão de publicação seguem válidas.
- **Validação:** apontar campos e arquivos inválidos junto aos controles correspondentes. Conservar os demais valores e as fotos válidas. O anunciante pode retirar arquivos inválidos da seleção antes de tentar publicar.
- **Falha de upload:** sinalizar o arquivo afetado e manter o diálogo. Guardar as URLs dos uploads que já terminaram enquanto o formulário continuar aberto, para uma nova tentativa enviar somente os arquivos ainda pendentes. Remover um arquivo deve também remover sua URL do payload. Enviar o anúncio apenas depois de todos os uploads da seleção atual concluírem.
- **Falha de publicação:** exibir a mensagem da API e manter o conteúdo para correção. A tela só confirma a publicação após resposta de sucesso. A submissão seguinte depende de ação do anunciante.
- **Cancelamento antes do envio:** descartar a edição local e retornar a Moradores. Oferecer **Cancelar** e fechamento por Escape enquanto a operação estiver ociosa.

## Interface gráfica

Usar a captura fornecida como referência para a posição do botão. Em telas largas, colocar **Anunciar quarto** no canto direito do cabeçalho do cartão **Moradores da casa**, na mesma linha do título e da descrição. Usar o botão primário do projeto com ícone `Plus` decorativo. Em telas estreitas, permitir que a ação fique abaixo do título dentro do mesmo cabeçalho. Preservar a barra lateral, as linhas de moradores e seus menus.

```text
Moradores
[Nome da residência]
┌───────────────────────────────────────────────────────────────────┐
│ Moradores da casa                               [+ Anunciar quarto] │
│ Gerencie os moradores e consulte o acesso de cada um                 │
├───────────────────────────────────────────────────────────────────┤
│ Lista de moradores                                                 │
└───────────────────────────────────────────────────────────────────┘
```

Abrir um diálogo **Anunciar quarto** sobre Configurações, seguindo o formulário de anúncio existente e o padrão visual do FullHouse. Usar fundo do cartão, bordas discretas, cantos arredondados, espaçamento e componentes já usados na interface. Organizar em duas colunas quando houver espaço e uma coluna no celular. O conteúdo rola entre o cabeçalho e as ações, que permanecem visíveis.

| Seção                 | Campos e controles                                                                                                                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quarto                | Casa de destino, título (até 150 caracteres), descrição (até 5.000), valor mensal em reais (de `0,01` a `99.999.999,99`, com até duas casas decimais) e tipo de moradia (`QUARTO_INDIVIDUAL`, `VAGA_COMPARTILHADA`, `REPUBLICA`).             |
| Localização e contato | Cidade e bairro (até 100 caracteres cada), endereço completo (até 255), contato (3 a 100 caracteres no contrato), e os dois controles de exibição pública, inicialmente desmarcados. Reutilizar a formatação de telefone do formulário atual. |
| Fotos                 | Seletor de arquivos, miniaturas com ação **Remover** identificada pelo nome do arquivo, contador `n/8` e mensagens por arquivo. Exibir os limites antes da seleção.                                                                           |
| Convivência           | Regras vigentes selecionáveis, texto público editável (até 5.000 caracteres), orientação sobre o que será público e escolha **Aceita pets** com opções **Sim** e **Não**, iniciando em **Não**.                                               |
| Ações                 | **Cancelar** e **Publicar anúncio**, com status durante o envio e feedback de sucesso ou erro.                                                                                                                                                |

Associar o título ao diálogo e os rótulos aos campos. Ao abrir, mover o foco para o diálogo e mantê-lo dentro dele enquanto estiver ativo. Restaurar o foco ao botão ao fechar, se ele continuar disponível, ou ao cabeçalho de Moradores se a permissão mudar. Anunciar os estados e erros com os recursos de acessibilidade já utilizados no projeto.

## Componentes sugeridos

| Arquivo ou módulo                                                                                                                                         | Responsabilidade                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`SettingsPage.tsx`](../../../web/features/settings/components/SettingsPage.tsx)                                                                          | Verificar seção, residência e papel. Abrir o diálogo e apresentar o resultado da criação em Moradores.                                                                                                  |
| [`SettingsMembersTable.tsx`](../../../web/features/settings/components/SettingsMembersTable.tsx)                                                          | Aceitar uma ação opcional no cabeçalho. Renderizá-la no modo `members`, inclusive quando a lista não tem moradores carregados.                                                                          |
| [`RoomListingForm.tsx`](../../../web/features/rooms/components/RoomListingForm.tsx)                                                                       | Reunir os campos comuns com `RoomsPage`, as validações e a montagem do payload, preservando o fluxo de edição existente.                                                                                |
| [`RoomListingDialog.tsx`](../../../web/features/rooms/components/RoomListingDialog.tsx)                                                                   | Orquestrar a prévia das fotos, o envio e o retorno do resultado. A composição usa `RoomListingPhotos` para a seleção e `RoomListingRules` para leitura do mural, revisão do texto e escolha sobre pets. |
| [`rooms.api.ts`](../../../web/features/rooms/api/rooms.api.ts) e [`house-rules.api.ts`](../../../web/features/house-collaboration/api/house-rules.api.ts) | Reutilizar `createRoomListing`, `uploadRoomPhoto` e `getHouseRules`.                                                                                                                                    |
| [`storage.service.ts`](../../../backend/src/storage/storage.service.ts)                                                                                   | Permitir leitura das fotos de anúncios pelo prefixo `room-listings/`, preservando as demais regras do bucket.                                                                                           |

## Integração e persistência

| Operação             | Contrato existente                                                                                                                                                                                                                                                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ler regras           | `GET /residences/:residenceId/rules`. Usar apenas título e descrição de regras selecionadas para compor o texto. A resposta interna também contém dados de autoria que ficam fora do payload do anúncio.                                                                                                                                        |
| Enviar foto          | `POST /rooms/listings/photos?casaId=<id>`. Enviar um arquivo no campo `file` em `multipart/form-data` e guardar a URL retornada. O backend aplica autorização, formatos aceitos e limite de 8 MiB. O serviço de armazenamento permite somente `GetObject` público no prefixo das fotos de anúncios e preserva as políticas dos demais arquivos. |
| Publicar             | `POST /rooms/listings`. Enviar `RoomListingInput` com `casaId`, campos do anúncio, `perfilConvivencia`, `aceitaPets`, `fotos` e flags de exposição. `RoomsService` utiliza `requireManager` para resolver a participação que assina o anúncio.                                                                                                  |
| Conferir o resultado | O anúncio é persistido em `anuncio_quarto` com status inicial `ABERTO`. Conferir pela consulta existente `GET /rooms/listings/mine?casaId=<id>` ou, com um perfil elegível para a busca, pelo fluxo de descoberta. A aba Moradores permanece aberta após publicar.                                                                              |

O texto final de convivência é uma cópia editável no anúncio. Carregar o mural sem selecionar regras por padrão. Ao confirmar as regras escolhidas, acrescentar ao texto os títulos e descrições que o anunciante deseja publicar e permitir revisão antes do envio. Guardar `aceitaPets` como booleano estruturado, separado do texto. A spec usa os campos já existentes em `anuncio_quarto` e preserva o mascaramento de endereço e contato no mapper da API.

## Estados da interface

- **Mural:** carregando, disponível, vazio ou com erro; a nova tentativa mantém os dados digitados.
- **Formulário:** editando, enviando fotos, publicando ou com erro. Formulário e arquivos ficam em memória até fechar o diálogo. Na confirmação, o status de sucesso aparece na página de origem.
- **Fotos:** arquivo selecionado, inválido, enviado ou com erro de envio. Liberar as URLs temporárias de miniatura ao remover a foto ou fechar o diálogo.

## Decisões implementadas

- O acesso abre um diálogo em Moradores e retorna à mesma aba após a publicação.
- Descrição e texto de convivência são obrigatórios nesse formulário para que o anúncio apresente os dados previstos em US013. Isso não muda a validação geral da API nem a edição de anúncios anteriores. As fotos são opcionais.
- O anunciante escolhe quais regras do mural se tornam públicas e revisa o texto final. A aceitação de pets é declarada para o anúncio, como no formulário atual. A casa continua com suas próprias configurações.

## Rastreabilidade

| Requisitos   | Design                                                                              | Critérios        |
| ------------ | ----------------------------------------------------------------------------------- | ---------------- |
| RF01, RNF03  | Ação em Configurações, residência vinculada, `requireManager` para criação e upload | CA01, CA02, CA07 |
| RF02, RF03   | Formulário, validação local e upload pelo serviço existente                         | CA02, CA03       |
| RF04, RF05   | Leitura protegida do mural, revisão do texto, pets e flags no mapper                | CA04, CA05       |
| RF06         | Estados de envio, confirmação na origem e recuperação de falha                      | CA06             |
| RNF01, RNF02 | Cabeçalho e diálogo responsivos, rótulos, foco e feedback                           | CA01, CA08       |
| RF07, RF08   | Painel da residência, edição do anunciante e decisões sobre interesses              | CA09, CA10       |
| RF09         | Notificação persistida e link direto                                                | CA11             |
| RF10         | Convite na negociação e atualização do vínculo e da tela inicial após o aceite      | CA12             |
| RF07         | Card compartilhado entre Moradores e busca de Quartos                               | CA13             |

## Gestão de anúncios em Moradores

- Acrescentar **Anúncios da casa** logo abaixo do cartão **Moradores da casa**. Usar `RoomListingCard`, compartilhado com a busca de Quartos, para exibir capa, valor, localização, tipo, pets e situação. O painel acrescenta autor, **Ver anúncio** e, para o anunciante, **Editar** e **Interessados**. Exibir carregamento, lista vazia e erro com opção de nova tentativa.
- Usar `GET /rooms/listings/house?casaId=<id>` com autenticação e participação ativa na residência. A resposta inclui o nome do autor, `canManage` e a quantidade de pedidos pendentes apenas para o anunciante ativo. Para outros moradores, aplicar as flags de endereço e contato na API. A prévia também aplica essas flags ao apresentar o anúncio ao próprio autor.
- Reutilizar `RoomListingDialog` para editar e `PATCH /rooms/listings/:id` para persistir. Abrir com os campos salvos e fotos existentes. Permitir remover ou acrescentar fotos pelos limites e permissões atuais. Recarregar a lista após publicar ou editar.
- Abrir **Interessados** para o anunciante e usar `GET /rooms/listings/:id/interests` e `PATCH /rooms/listings/:id/interests/:interestId`. Após aceitar, oferecer **Abrir conversa** para a negociação retornada. Preservar a autorização do anunciante na API.
- Na transação que cria ou reabre o interesse, criar uma `notificacao` do tipo `SISTEMA` com `entidade_tipo` igual a `INTERESSE_QUARTO` e `entidade_id` igual ao ID do anúncio. Usar o sino e a tela de notificações existentes para abrir `/settings?section=members&listingId=<id>#anuncios-da-casa`. O painel resolve o ID dentro dos anúncios autorizados da residência atual. Pedidos antigos continuam consultáveis no painel.

## Aceitar convite e acessar a casa

- O aceite do interesse mostra o próximo passo ao anunciante, que abre a conversa para enviar o convite. A resposta da negociação inclui o último convite e indica se o usuário é o destinatário autorizado a responder.
- Sino e conversa usam o mesmo endpoint de decisão do convite. No aceite, o backend confirma que a casa está ativa e, numa transação, vincula o destinatário como `MORADOR`, atualiza sua situação para `MORANDO` e registra a decisão. As regras atuais de autorização e unicidade de participação continuam valendo.
- Quando a API confirma o aceite e devolve o ID da participação, o frontend sinaliza a mudança para as telas que usam a residência, recarrega os dados da sessão e leva a pessoa à Home. A Home consulta o vínculo para abrir a área da casa. Recusa e erro ficam na tela de origem com o resultado correspondente.
