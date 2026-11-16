# Tasks

## 1. Chat da residência — backend e persistência

- [x] 1.1 Criar a migração para unicidade de uma conversa `CASA` por residência; incluir verificação de duplicatas existentes e teste de migração que confirme falha segura sem apagar mensagens.
- [x] 1.2 Implementar módulo, DTOs e rotas REST do chat para obter histórico e enviar mensagens; validar participação ativa, conteúdo não vazio, autoria autenticada e ordenação cronológica, com testes unitários para autorização, isolamento entre casas e validações.
- [x] 1.3 Implementar o fluxo SSE autenticado para novas mensagens, com associação ao canal da conversa, limpeza na desconexão e interrupção após perda de participação; cobrir conexão autorizada/negada, entrega sem cruzamento de casas e revogação em testes.
- [x] 1.4 Adicionar testes HTTP das rotas REST e do fluxo para respostas `401`, `403`, `404` e corpos de requisição inválidos; executar a suíte E2E do chat.

## 2. Chat da residência — frontend

- [x] 2.1 Criar cliente HTTP e página privada do chat com histórico, autor, data/hora, envio e reconexão do fluxo com recuperação das mensagens após o último ID; testar a API cliente.
- [x] 2.2 Integrar o chat à navegação e à seleção de residência, exibindo mensagens novas sem recarregar e estado de conexão/desconexão; testar envio, recebimento ao vivo, reconexão e isolamento do contexto da casa.

## 3. Mural de regras

- [x] 3.1 Implementar rotas, DTOs, serviço e repositório para listar, criar e editar regras `CASA` vigentes, preenchendo criação/última edição com a participação autenticada; testar campos obrigatórios, autoria, acesso de membros e isolamento residencial.
- [x] 3.2 Adicionar testes HTTP para mural e edição de regras, incluindo autenticação, membro sem vínculo e recurso inexistente; executar a suíte E2E de regras.
- [x] 3.3 Criar cliente e página privada do mural para consultar, cadastrar e editar título/descrição, exibindo data, criador e último editor; testar os fluxos e erros de formulário na interface.
- [x] 3.4 Adicionar o mural à navegação privada e validar que regras revogadas não aparecem no mural padrão; testar a navegação e o filtro de status.

## 4. Reuniões da residência

- [x] 4.1 Implementar rotas, DTOs, serviço e repositório para criar reunião e convites pendentes para todos os membros ativos em uma transação; validar data/hora futura e pauta; testar organizador, convites completos, validações e reversão em caso de erro.
- [x] 4.2 Implementar respostas confirmar/recusar e consulta de participantes, permitindo resposta somente ao membro ativo convidado; testar status, data de resposta e bloqueio de não convidados/não membros.
- [x] 4.3 Implementar reagendamento com histórico e novos convites pendentes e cancelamento pelo organizador; testar vínculo da reunião substituta, preservação do evento anterior e bloqueio de ações por outros membros.
- [x] 4.4 Adicionar testes HTTP para criação, consulta, resposta, reagendamento e cancelamento, cobrindo autenticação e códigos `400`, `401`, `403` e `404`; executar a suíte E2E de reuniões.
- [x] 4.5 Criar cliente e página privada de reuniões para marcar, consultar, responder, reagendar e cancelar eventos; testar os fluxos, erros e permissões na interface.
- [x] 4.6 Integrar reuniões à navegação privada e exibir situação da reunião e resposta de cada participante; testar reunião cancelada/reagendada e atualização da lista.

## 5. Integração

- [x] 5.1 Verificar consistência dos três contratos HTTP e autorização baseada em participação ativa; executar testes unitários e E2E dos módulos chat, regras e reuniões.
- [x] 5.2 Executar testes web dos três fluxos e builds do backend/frontend; corrigir falhas e registrar os comandos/resultados de verificação na documentação da Sprint 2.
