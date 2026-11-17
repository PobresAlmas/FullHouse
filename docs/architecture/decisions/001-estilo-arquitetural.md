Estilo arquitetural do FullHouse

## Contexto e evidências

O [AppModule](../../../backend/src/app.module.ts) reúne os módulos NestJS na mesma aplicação. O [bootstrap](../../../backend/src/main.ts) inicia uma API. A interface está em `web/`, e o [Compose](../../../docker-compose.yml) define aplicações web e API separadas e dependências locais. Módulos como regras possuem controller, serviço e repositório. Outros serviços acessam Prisma diretamente.

## Justificativa técnica

A API possui separação por funcionalidades e uma implantação conjunta, com persistência compartilhada. O nome escolhido descreve essas propriedades sem prometer isolamento rigoroso entre módulos.

## Consequências

A equipe pode alterar funcionalidades dentro da mesma API e reutilizar serviços comuns. A implantação e a escala do backend abrangem o conjunto dos módulos. A base compartilhada e os acessos diretos ao Prisma exigem cuidado com acoplamento entre funcionalidades.

## Alternativas comparadas nesta revisão

Microsserviços exigiriam fronteiras e implantação independente dos serviços, que não existem hoje. Clean Architecture ou arquitetura hexagonal exigiriam examinar a direção de dependências e estabelecer contratos de infraestrutura de forma mais rigorosa. Essas são comparações atuais, não alternativas comprovadamente discutidas ou rejeitadas pela equipe no início do projeto.

## Verificação

As figuras e o inventário em [Arquitetura](../README.md) refletem os arquivos citados. Nenhuma extração de serviço ou alteração do banco faz parte deste registro.
