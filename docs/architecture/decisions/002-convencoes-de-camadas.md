# Responsabilidades das camadas

## Contexto

[HouseRulesService](../../../backend/src/house-rules/house-rules.service.ts) coordena o acesso e usa um repositório. [TaskExchangeService](../../../backend/src/tasks/task-exchange.service.ts) e [ResidenceAccessService](../../../backend/src/residences/residence-access.service.ts) consultam Prisma diretamente. Logo, o backend não possui uma barreira uniforme de repositórios.

## Proposta

Manter a arquitetura em camadas e usar controller → serviço → repositório como convenção nas novas operações. Controllers tratam o contrato HTTP, serviços coordenam casos de uso e autorização, e repositórios concentram consultas e gravações. Operações entre módulos devem reutilizar serviços exportados quando houver um contrato adequado.

## Justificativa e consequências

A convenção torna mais previsível o local de cada responsabilidade e permite testar consultas e coordenação separadamente. Ela também acrescenta arquivos e exige preservar as fronteiras transacionais. Não é necessário extrair cada chamada apenas para eliminar uma importação: a extração deve conservar a unidade da operação e o contrato público.

## Alternativas comparadas agora

Manter os acessos diretos é compatível com as camadas abertas atuais, mas mantém a variação entre módulos. Uma refatoração completa para camadas estritas seria maior e precisaria de validação das transações e permissões.
