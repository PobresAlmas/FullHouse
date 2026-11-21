# Referências visuais originais (não mockups gerados)

São nove capturas **enviadas pelo usuário**. Trate-as como referência de hierarquia, tipografia, densidade, cores, espaçamento, estados e organização. Não recriar layout genérico de “dashboard de configurações”.

| Captura | UI a respeitar | Observações |
|---|---|---|
| `Perfil - Casa.png` | Informações da casa e moradores | Nome e data da casa, lista de moradores |
| `Perfil - Moradores.png` | Lista de moradores | Nome, email, função e menu contextual |
| `Perfil - Permissões.png` | Permissões individuais | Atenção: backend tem **política global**, não os três níveis visuais por pessoa |
| `Perfil - Notificações.png` | Histórico/centro de notificações | Backend existente lista só parte dos resultados; verificar paginação |
| `Perfil - Preferências _ Geral.png` | Geral | Nome da casa, data de criação, aparência e tipos de notificação |
| `Perfil - Preferências _ Categorias.png` | Categorias | CRUD de categorias da despensa: reaproveitar API existente |
| `Perfil - Preferências _ Despensa.png` | Despensa | Antecedência de validade e exibição de vencidos |
| `Perfil - Preferências _ Financeiro.png` | Financeiro | Antecedência de vencimento e exibição de atrasadas |
| `Perfil - Preferências _ Pets.png` | Pets | Preferências para lembretes de vacinas, vermífugo e consultas |

## Diretrizes de fidelidade

- Fundo quase branco com leve lilás; painel secundário e bordas finas lilás/cinza, cartões sem sombras pesadas.
- Verde escuro em ações e elementos selecionados; **lilás claro** para seleção da navegação interna (não substituir tudo por verde).
- Estrutura desktop: **sidebar global existente + cabeçalho global existente + navegação interna vertical + conteúdo à direita**.
- Nas Preferências: segunda navegação horizontal `Geral | Categorias | Despensa | Financeiro | Pets`.
- Campos e cards compactos, rótulos e subtítulos legíveis, nada de fundos com gradientes, glassmorphism, fontes gigantes ou ícones decorativos grandes.
- `Minha conta` deve levar para o `/profile` existente, preservando o formulário atual.
- O protótipo é orientação visual, mas não substitui a validação dos contratos de API nem autoriza apresentar opções sem persistência como funcionais.

## Critérios de revisão visual

Capturar no navegador (desktop 1512×982, como os originais, e mobile ~390×844): `Casa`, `Moradores`, `Permissões`, `Notificações`, `Preferências/Geral`, `Categorias`, `Despensa`, `Financeiro`, `Pets`. Comparar **lado a lado** com as imagens. Diferenças deliberadas devem ser registradas no PR.
