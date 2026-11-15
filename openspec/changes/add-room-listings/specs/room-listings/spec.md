# room-listings Specification

## ADDED Requirements

### Requirement: Criar anúncio de quarto

O sistema SHALL permitir que usuário autenticado com participação ativa em uma casa publique um anúncio, vinculando a participação autenticada como anunciante.

#### Scenario: Cadastro válido
- **GIVEN** usuário autenticado com participação ativa na casa informada
- **WHEN** envia título, preço mensal positivo, cidade e contato válidos
- **THEN** o anúncio é criado em estado `ABERTO`, com flags de privacidade falsas por padrão, e a resposta aplica as regras de mascaramento

#### Scenario: Sem participação ativa
- **GIVEN** usuário sem participação ativa na casa
- **WHEN** tenta criar anúncio para essa casa
- **THEN** a API responde `403` e não persiste o anúncio

#### Scenario: Dados inválidos
- **GIVEN** preço negativo, título/cidade ausentes ou formato inválido
- **WHEN** o usuário envia o cadastro
- **THEN** a API responde `400` com erros por campo e não persiste o anúncio

### Requirement: Preservar privacidade de endereço e contato

O sistema SHALL aplicar no servidor o mascaramento de `enderecoCompleto` e `contato` em toda resposta pública e em respostas de interesse quando `exibeEnderecoCompleto` ou `exibeContato`, respectivamente, forem `false`.

#### Scenario: Ambas as flags desativadas
- **GIVEN** `exibeEnderecoCompleto=false` e `exibeContato=false`
- **WHEN** usuário consulta lista ou detalhe público
- **THEN** JSON inclui `enderecoCompleto: null` e `contato: null`

#### Scenario: Flags independentes
- **GIVEN** endereço oculto e contato exibido
- **WHEN** anúncio é consultado publicamente
- **THEN** endereço é `null` e contato mantém o valor persistido; cada flag controla somente seu próprio campo

#### Scenario: Nenhum endpoint contorna o mascaramento
- **GIVEN** uma rota pública, consulta de interesse ou mapper serializa o anúncio
- **WHEN** uma das flags está falsa
- **THEN** o campo correspondente não é incluído com o valor original em payload, logs ou erros

### Requirement: Buscar anúncios com filtros e paginação

O sistema SHALL permitir busca pública de anúncios `ABERTO`, paginada, com filtros cumulativos de cidade, bairro e faixa de preço; filtros estruturados adicionais só são aceitos quando persistidos no modelo.

#### Scenario: Busca por localização e faixa
- **GIVEN** anúncios abertos em localidades e preços diferentes
- **WHEN** consulta com cidade, bairro, `precoMin` e `precoMax`
- **THEN** retorna somente os anúncios que satisfazem todos os filtros, usando correspondência parcial case-insensitive para localização e limites inclusivos de preço

#### Scenario: Paginação padrão
- **GIVEN** mais de dez anúncios correspondentes
- **WHEN** consulta sem `page` e `limit`
- **THEN** retorna a primeira página com até dez registros e metadados `total`, `page`, `limit` e `totalPages`

#### Scenario: Intervalo ou paginação inválidos
- **GIVEN** mínimo maior que máximo, números negativos ou limite superior ao máximo configurado
- **WHEN** consulta a busca
- **THEN** a API responde `400` indicando o parâmetro inválido

### Requirement: Consultar detalhe e manifestar interesse

O sistema SHALL permitir a consulta pública de detalhes com os mesmos limites de privacidade e permitir que usuário autenticado registre interesse por anúncio aberto.

#### Scenario: Interesse autenticado
- **GIVEN** usuário autenticado e anúncio aberto
- **WHEN** envia uma mensagem de interesse válida
- **THEN** cria um `interesse_anuncio` associado ao usuário e anúncio, sem revelar campos privados

#### Scenario: Anúncio fechado ou duplicidade
- **GIVEN** anúncio fechado ou interesse pendente já existente do mesmo usuário
- **WHEN** tenta manifestar interesse novamente
- **THEN** a API rejeita com estado HTTP coerente (`409` para conflito) sem duplicar o interesse

### Requirement: Gerir anúncios próprios

O sistema SHALL permitir que somente a participação anunciante autenticada edite, feche/reabra ou remova o próprio anúncio.

#### Scenario: Proprietário atualiza anúncio
- **GIVEN** anunciante autenticado e anúncio próprio
- **WHEN** envia `PATCH` com campos válidos ou status válido
- **THEN** apenas os campos informados são atualizados e `atualizadoEm` é renovado

#### Scenario: Outro usuário altera anúncio
- **GIVEN** usuário autenticado sem ownership do anúncio
- **WHEN** tenta atualizar ou excluir
- **THEN** recebe `403` e nenhum dado é alterado

#### Scenario: Exclusão preserva histórico
- **GIVEN** anúncio com interesses relacionados
- **WHEN** anunciante remove o anúncio
- **THEN** o anúncio deixa de aparecer na busca e os interesses não são apagados em cascata

### Requirement: Frontend integrado para descoberta e gestão

O sistema SHALL fornecer interface web funcional para buscar, filtrar, consultar detalhes, manifestar interesse e gerir anúncios usando os contratos backend, dados reais e componentes compartilhados do FullHouse.

#### Scenario: Busca e filtros visuais
- **GIVEN** usuário abre a área de quartos
- **WHEN** informa localização, faixa de preço ou regra estruturada
- **THEN** vê filtros aplicados removíveis, resultados paginados e cards com dados retornados pela API, em layout responsivo inspirado em `openspec/Quartos.png`

#### Scenario: Sem resultados ou falha de rede
- **GIVEN** busca sem resultados ou API indisponível
- **WHEN** a consulta termina
- **THEN** a interface apresenta estado vazio ou erro recuperável, sem confundir falha com lista vazia

#### Scenario: Publicar e gerir anúncio
- **GIVEN** usuário autenticado com participação ativa
- **WHEN** abre formulário e salva anúncio válido
- **THEN** vê confirmação e o anúncio aparece na área de gestão; erros de validação são exibidos junto aos campos

#### Scenario: Acesso público com dados ocultos
- **GIVEN** anúncio tem contato/endereço mascarados pela API
- **WHEN** a UI exibe card ou detalhe
- **THEN** apresenta indicação de privacidade e nunca tenta reconstruir ou exibir o valor oculto

### Requirement: Qualidade e acessibilidade

A interface SHALL suportar teclado, leitores de tela e viewport estreita, e a API SHALL validar, autorizar e paginar consistentemente.

#### Scenario: Navegação acessível
- **GIVEN** usuário navega sem mouse ou com tecnologia assistiva
- **WHEN** usa busca, filtros, cards, formulário e paginação
- **THEN** todos controles têm nome acessível, foco visível, ordem lógica e feedback de carregamento/erro anunciado

#### Scenario: Layout estreito
- **GIVEN** viewport móvel
- **WHEN** busca e administra anúncios
- **THEN** filtros e formulários continuam utilizáveis sem sobreposição ou perda de ações essenciais
