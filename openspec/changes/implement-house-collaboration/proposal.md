# Proposal

## Why

Moradores ainda precisam recorrer a outros aplicativos para conversar, consultar regras da casa e organizar reuniões. Embora o banco já tenha estruturas para essas informações, a aplicação não oferece os fluxos previstos pelos RF011, RF012 e RF013 do documento de requisitos.

## What Changes

- Criar um chat da residência com histórico, autoria e horário das mensagens, acesso restrito a membros ativos e atualização em tempo real para membros conectados.
- Criar um mural de regras com título, descrição, data de cadastro e identificação de quem cadastrou ou alterou a regra por último.
- Permitir que moradores marquem reuniões com data, horário e pauta, responderem ao convite, e que o organizador reagende ou cancele a reunião.
- Reutilizar os modelos existentes de conversa, mensagem, regra, reunião e participantes quando forem compatíveis; adicionar migrações somente para requisitos de persistência que o schema atual não cobre.
- Adicionar testes unitários, HTTP e de interface para as capacidades e suas regras de autorização.

## Capabilities

### New Capabilities

- `group-chat`: conversa da residência com autorização por membro e entrega ao vivo de novas mensagens para usuários conectados.
- `house-rules`: mural consultável pelos membros, com cadastro e rastreabilidade de autoria/última alteração.
- `house-meetings`: agendamento de reuniões, respostas dos participantes e reagendamento/cancelamento pelo organizador.

### Modified Capabilities

Nenhuma. O projeto ainda não possui specs de capacidades existentes.

## Impact

- Backend NestJS: novos módulos/rotas, validações, controle de acesso por participação ativa e transmissão autenticada em tempo real para o chat.
- Frontend Next.js: novas páginas e clientes de API para chat, mural de regras e reuniões.
- Prisma/PostgreSQL: modelos necessários já existem no schema atual; confirmar constraints e adicionar migrações apenas se forem indispensáveis.
- Testes: cobertura unitária do serviço/repositório, E2E HTTP e interface; testes do canal ao vivo do chat.
- Sem escopo de notificações gerais, push, e-mail ou disponibilidade online/presença; o requisito de mensagens sem recarregar será atendido somente enquanto os membros estiverem conectados à tela do chat.
