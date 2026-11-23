# Prompts — FullHouse

## 1. Preparar ou atualizar a SPEC-001

Leia `AGENTS.md` e use `exemplo-openspec2/` como referência de estrutura. Atualize `requirements.md`, `design.md` e `tasks.md` em `openspec02/spec/001-anunciar-quarto/` para revisão.

1. Consulte o RF015 / US013 e a implementação atual de Configurações, Quartos e Regras da Casa.
2. Especifique o botão **Anunciar quarto** no canto direito do cabeçalho **Moradores da casa**, em **Configurações → Moradores**, seguindo a localização da captura e o estilo do FullHouse.
3. Descreva como uma pessoa autorizada publica para a residência exibida, preenche a descrição, seleciona fotos e revisa o perfil de convivência, as regras selecionadas do mural, a aceitação de pets e a visibilidade de endereço e contato.
4. Separe critérios verificáveis, decisões de interface e integração e tarefas numeradas. Identifique as decisões propostas para revisão e mantenha os checkboxes de implementação em aberto.

Nesta etapa, entregue somente a documentação da spec.

## 2. Implementar a SPEC-001 após aprovação

Implemente `openspec02/spec/001-anunciar-quarto/` seguindo `AGENTS.md` quando a implementação for solicitada.

**Antes de implementar**

1. Leia `requirements.md`, `design.md` e `tasks.md` e confira os pontos de integração com o código existente.
2. Resuma as etapas e identifique dependências ou divergências que afetam os critérios aprovados.

**Durante a implementação**

1. Siga a ordem de `tasks.md` e reutilize o fluxo de fotos e de publicação, com a residência e a autorização verificadas pela API.
2. Mantenha o código e a spec consistentes dentro do escopo autorizado. Atualize os checkboxes conforme as tarefas forem verificadas.

**Ao finalizar**

1. Execute as verificações aplicáveis e confira os critérios de aceitação.
2. Relate o que foi entregue, os resultados observados e o que ainda precisa de validação.

## 3. Revisar a SPEC-001 ou a implementação

Leia os três arquivos da spec e compare os requisitos, fluxos, contratos e critérios com o pedido e com a base do projeto. Antes da implementação, revise a coerência da spec e a viabilidade da integração. Depois da implementação, verifique também o código e as tarefas marcadas como concluídas.

Apresente os achados por gravidade, indicando o requisito ou critério afetado, os arquivos relacionados e os resultados ou limites da verificação. Faça a revisão em modo de leitura e aplique correções quando forem solicitadas.
