# Como usar no seu agente OpenSpec

O fluxo OpenSpec `spec-driven` trabalha com `proposal.md`, delta `specs/**/spec.md`, `design.md` e `tasks.md` dentro de `openspec/changes/<change>`. A pasta desta entrega já tem esses artefatos, para leitura e revisão antes do `apply`.

## Integração

1. Extraia o ZIP **na raiz do repositório**, preservando as pastas `openspec/changes/implement-house-settings/` e `docs/design-references/settings/`.
2. Verifique se a change já existe. Se existir, faça diff/manual merge, não sobrescreva.
3. `git status` para confirmar somente documentos/imagens inseridos. Não copie `backend.zip` ou código de exemplo para o repo.
4. Antes de implementar, peça ao agente um **gap analysis** do repositório atual. Para Figma conectado, substitua screenshots por referência de frames editáveis se quiser medidas exatas; as imagens são suficientes como referência visual estática.

## Prompt de revisão (cole no seu agente)

```text
Leia integralmente openspec/changes/implement-house-settings/{proposal.md,design.md,tasks.md}, ambas as delta specs e docs/REVISAO-ANTES-DE-CODAR.md. Inspecione o código real do monorepo, o schema.prisma, as migrações e as nove imagens em docs/design-references/settings. NÃO implemente ainda. Gere uma tabela de divergências entre a especificação e o código, confirme os endpoints e decisões de permissão e aponte tudo que depende de infraestrutura inexistente. Não invente APIs, roles ou tabelas. Preserve o layout visual do protótipo; apresente as dúvidas técnicas necessárias em uma revisão curta e proponha alterações nos .md antes de tocar no código.
```

## Prompt para iniciar a fase 1

```text
Implemente somente a Fase 1 de openspec/changes/implement-house-settings/tasks.md (etapas 0 a 4), seguindo os cenários de spec.md. Reutilize AppSidebar/AppPageHeader, /profile, residence permissions e pantry categories existentes. Crie /settings fiel aos screenshots originais. Não implemente preferências falsas; quando uma ação depender da Fase 2, não a exiba habilitada. Adicione testes e rode lint/build/test conforme manifests reais. Documente os arquivos alterados e qual cenário cada teste cobre.
```

## Continuação

Depois de revisar uma fase, use o fluxo de aplicação do agente configurado (por exemplo `/opsx:apply implement-house-settings`, se suportado). Se o agente tentar implementar a change inteira, instrua que **o escopo da rodada** é apenas a fase específica. Atualize a check-list ao concluir; não marque tarefa sem teste.

## Revisão visual

```text
Compare as telas reais de /settings com as nove capturas originais em docs/design-references/settings. Avalie estrutura, sidebar dupla, alinhamentos, cores lilás e verde, densidade de informações, estados e responsividade. Não gere um novo design: implemente o layout existente respeitando tokens e padrões do código. Liste divergências concretas por tela com antes/depois e crie screenshots de validação.
```
