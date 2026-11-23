# SPEC-002 — Colaboração da casa

**Estado:** chat, mural de regras e reuniões implementados no registro original.
**Change de origem:** `implement-house-collaboration`.

## Objetivo

Reunir o chat, as regras e o agendamento de reuniões no FullHouse, com autoria identificada e acesso restrito aos moradores ativos da residência.

## História de usuário

Como morador, quero conversar com as pessoas da casa, consultar e manter suas regras e combinar reuniões, para organizar a convivência em um só lugar.

**Referências do projeto:** RF011, RF012 e RF013 na [documentação da Sprint 02](../../../docs/sprints/sprint02/Iago/colaboracao-casa/requisitos.md), conforme a numeração usada pela change de origem. Os identificadores RF, RNF e CA abaixo são locais à SPEC-002.

## Pré-condições

- Sessão autenticada e participação ativa na residência consultada.
- Para responder a uma reunião, o morador precisa de um convite ativo para aquele evento.
- Para cancelar ou reagendar, o morador precisa ser o organizador de uma reunião agendada.

## Requisitos funcionais

- **RF01 — Histórico do chat.** Disponibilizar a conversa e o histórico da residência aos membros ativos, com mensagens em ordem cronológica, autor e data e horário de envio.
- **RF02 — Envio de mensagem.** Aceitar texto não vazio e persistir a mensagem com a participação autenticada como autora e com data e horário atribuídos pelo servidor.
- **RF03 — Mensagens em tempo real.** Entregar novas mensagens persistidas aos moradores conectados à conversa, sem recarregar a página. Recuperar as mensagens posteriores ao último ID recebido na reconexão.
- **RF04 — Consulta ao mural.** Mostrar regras vigentes da casa com título, descrição, data de cadastro, criador e último editor. Manter regras revogadas fora da lista padrão.
- **RF05 — Cadastro e edição de regras.** Permitir que líderes e administradores com vínculo ativo cadastrem ou editem regras da própria casa com título e descrição não vazios, registrando autor e última edição. Outros moradores ativos mantêm acesso de consulta conforme a [matriz de permissões de G05](../003-configuracoes-da-casa/requirements.md#matriz-de-permissões-de-g05).
- **RF06 — Agendamento.** Permitir que um membro ativo marque reunião com data e horário futuros e pauta não vazia. Identificar aquele membro como organizador e criar um convite pendente para cada morador ativo, incluindo ele próprio.
- **RF07 — Resposta a convite.** Permitir que um morador ativo convidado confirme ou recuse presença. Registrar a resposta e seu horário e exibir a situação atual aos moradores ativos.
- **RF08 — Reagendamento e cancelamento.** Permitir que somente o organizador reagende ou cancele a reunião agendada. Reagendar cria uma reunião substituta vinculada e novos convites pendentes. Cancelar preserva o evento no histórico como cancelado.

## Requisitos não funcionais

- **RNF01 — Autorização e isolamento.** Validar participação ativa a cada operação, incluindo a conexão ao vivo. Ao revogar a participação, encerrar o fluxo de chat e impedir entregas posteriores. Nenhuma operação deve retornar dados de outra casa sem acesso.
- **RNF02 — Consistência.** Transmitir mensagens após a confirmação da persistência. Gravar a reunião e os convites juntos e preservar o histórico durante reagendamentos e cancelamentos.

## Regras de negócio

1. Cada residência tem uma conversa de tipo `CASA`. As conversas de subgrupo têm tratamento próprio.
2. O mural consulta regras `CASA` vigentes. Em uma regra ainda sem edição, o criador também é exibido como último editor.
3. A lista de convidados reflete os moradores ativos no momento da criação ou do reagendamento. A resposta exige que o vínculo residencial ainda esteja ativo.
4. Reagendar marca o evento anterior como `REAGENDADA`. Cancelar marca o evento como `CANCELADA`. Ambos seguem disponíveis no histórico.

## Caso de uso — Usar os recursos de colaboração

**Ator:** morador ativo da residência.

**Fluxo principal**

1. Abrir o chat da casa, consultar o histórico e enviar uma mensagem. Os demais moradores conectados a recebem.
2. Abrir o mural, consultar as regras vigentes e cadastrar ou editar uma regra. A atualização fica identificada com seu autor.
3. Abrir Reuniões, escolher data e horário futuros e informar a pauta. Os moradores ativos recebem seus convites.
4. Consultar participantes e respostas. O organizador pode reagendar ou cancelar se precisar alterar o evento.

**Fluxos alternativos**

- **A1 — Participação ausente ou encerrada.** Negar o acesso e encerrar o fluxo de chat que estiver aberto para o usuário.
- **A2 — Dados inválidos.** Rejeitar mensagens em branco, regras incompletas e reuniões sem data, horário ou pauta ou com data no passado.
- **A3 — Falha de conexão.** Reconectar o chat e recuperar o histórico a partir da última mensagem recebida.
- **A4 — Ação de reunião sem autorização.** Preservar o evento e os convites quando alguém sem convite ativo responde ou quando outro membro tenta reagendar ou cancelar.

## Critérios de aceitação

- **CA01 — Acesso ao chat.** Um membro autenticado consulta conversa e histórico da própria casa. Um usuário sem vínculo ativo não obtém conversa, mensagens ou fluxo. A revogação encerra a entrega de novos eventos.
- **CA02 — Envio e histórico.** Texto não vazio aparece com autoria autenticada, data e horário definidos pelo servidor e ordem cronológica. Texto em branco não é gravado.
- **CA03 — Entrega e reconexão.** O remetente recebe a mensagem persistida na resposta do envio. Outro morador conectado à mesma conversa a recebe ao vivo. Conversas de outras casas não recebem o evento. A reconexão recupera mensagens após o último ID.
- **CA04 — Consulta ao mural.** Membro ativo vê as regras vigentes da casa, com os campos previstos. Usuário sem vínculo e consultas a outra residência não recebem regras dessa casa.
- **CA05 — Cadastro e edição do mural.** Gestor ativo grava título, descrição, data e criador. A edição identifica o último editor. Formulário incompleto, tentativa por morador sem papel de gestão ou tentativa externa à casa mantém os dados inalterados.
- **CA06 — Criar reunião.** Envio válido grava o organizador e todos os convites pendentes, incluindo o do próprio organizador. Dados inválidos ou acesso sem vínculo não criam registros.
- **CA07 — Responder a reunião.** Confirmar ou recusar atualiza a situação e o horário visíveis aos membros ativos. Resposta sem convite ativo ou sem participação ativa não altera nenhuma resposta.
- **CA08 — Reagendar.** Preservar a reunião original como reagendada e criar outra vinculada, com convites para os moradores ativos atuais.
- **CA09 — Cancelar ou negar gestão.** Cancelamento pelo organizador fica no histórico. Tentativas de outros membros mantêm a reunião inalterada. Acesso sem vínculo não retorna os detalhes.

## Fora do escopo

Notificações gerais, push, e-mail, presença, indicação de digitação, reações, mensagens diretas, chat ou regras de subgrupo, votação de regras, chamadas de voz ou vídeo e transmissão de eventos entre várias instâncias do backend.
