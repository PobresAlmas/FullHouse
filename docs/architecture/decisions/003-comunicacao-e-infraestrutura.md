# Comunicação e dependências externas

## Contexto e fonte histórica disponível

O [design de colaboração](../../../openspec/changes/implement-house-collaboration/design.md) registra a escolha de REST para histórico e envio e SSE para recebimento no chat, incluindo a comparação com WebSocket. A [implementação do chat](../../../backend/src/chat/chat.service.ts) distribui eventos com RxJS em memória local. As integrações de banco, armazenamento e e-mail estão no código e no Compose.

## Decisões registradas

Manter REST e SSE como implementados para o chat da residência. Manter Prisma/PostgreSQL na persistência, API S3 para arquivos e Resend no envio de recuperação de senha.

## Justificativa técnica

A direção servidor → cliente do SSE atende ao recebimento de novas mensagens, enquanto o envio usa o contrato HTTP. O PostgreSQL concentra os relacionamentos e transações existentes. Os arquivos têm armazenamento próprio, separado dos registros relacionais.

## Consequências e limites

A distribuição SSE e o contador de requisições em memória precisam de estratégia compartilhada antes de usar várias réplicas com comportamento consistente. O endereço interno dos containers deve ser distinguido do endereço público utilizado pelo navegador. As configurações públicas do Next.js não devem conter segredos e são incorporadas ao código cliente.
