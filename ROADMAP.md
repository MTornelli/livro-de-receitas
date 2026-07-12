# 🍳 Livro de Receitas — Roadmap & Handoff para Claude Code

## Contexto do projeto

Repositório pessoal de receitas iniciado como arquivo HTML standalone (offline-first, sem backend, sem conta). Desenvolvido iterativamente via Claude.ai. O objetivo de longo prazo é evoluir para um app de desktop/mobile real, mantendo a filosofia de simplicidade e independência.

---

## O que foi construído até agora

### Arquivo atual: `receitas.html`
Arquivo HTML único, abre direto no navegador, sem dependências externas além de ícones via CDN (Tabler Icons). Funciona offline.

### Funcionalidades implementadas

**Navegação e busca**
- Grid de cards com todas as receitas
- Busca em tempo real por nome, descrição, categoria e chef
- Filtro por abas de categoria (Minhas receitas / Molhos / Receitas de chefs)

**Visualização de receitas**
- Modal com ingredientes, modo de preparo passo a passo e metadados (tempo, categoria)
- Checkbox por ingrediente para marcar o que já foi usado enquanto cozinha
- Badges visuais com código de cores por tipo:
  - 🟢 Verde → Minhas receitas (pessoais/família)
  - 🟡 Âmbar → Molhos (com coroa para os molhos mãe)
  - 🟣 Roxo → Receitas de chefs (com ícone de chef-hat e nome do chef)
- Nota informativa nos molhos mãe indicando os derivados

**Lista de compras**
- Botão flutuante aparece ao selecionar receitas
- Agrega ingredientes de múltiplas receitas automaticamente
- Indica quantas receitas usam o mesmo ingrediente
- Copia lista formatada para clipboard (para WhatsApp etc.)
- Limpar seleção com um clique

**Visual**
- Dark mode automático (via `prefers-color-scheme`)
- Layout responsivo (mobile-friendly)
- Animação sutil nos cards ao hover

### Conteúdo atual (22 receitas)

**Minhas receitas (6)**
- Chimichurri fresco
- Brigadeiro Tornelli (pressão)
- Strogonoff
- Petisco da copa (air fryer)
- Marinada para frango (cajun + gergelim)
- Marinada para coração (chimichurri + cerveja)

**Molhos — 5 molhos mãe franceses**
- Béchamel, Espagnole, Velouté, Hollandaise, Sauce Tomat

**Molhos — 7 molhos secundários**
- Demi-glace, Béarnaise, Mornay, Gremolata, Bordelaise, Beurre Blanc, Allemande

**Receitas de chefs (7)**
- Gordon Ramsay: Scrambled eggs, Bife perfeito
- Massimo Bottura: Cacio e Pepe
- Joël Robuchon: Frango assado, Crème brûlée
- Thomas Keller: Ratatouille confit byaldi
- Jacques Pépin: Salmão en papillote

### Stack atual
- HTML + CSS + Vanilla JS (zero dependências de runtime)
- Tabler Icons via CDN
- Sem banco de dados — receitas hardcoded no JS
- Sem persistência de estado entre sessões (lista de compras reseta ao fechar)

---

## Próximos passos — Funcionalidades a implementar

### Fase 1 — Melhorias no HTML atual (sem framework)

Essas podem ser feitas ainda no formato de arquivo único antes de migrar para app.

**1.1 Adicionar receitas direto no app**
- Formulário modal com campos: nome, emoji, categoria, tempo, ingredientes (adicionar linha por linha), passos
- Salvar no `localStorage` do navegador
- Diferenciar visualmente receitas adicionadas pelo usuário vs as hardcoded
- Exportar/importar receitas em JSON (backup manual)

**1.2 Persistência de estado**
- Salvar lista de compras selecionada no `localStorage`
- Lembrar ingredientes marcados como "tenho em casa"

**1.3 Modo de cozinha**
- Visualização passo a passo com navegação (anterior / próximo)
- Timer integrado por etapa
- Tela que não apaga (wake lock API)

---

### Fase 2 — Migração para app desktop/mobile

**Stack recomendada: Electron (desktop) + Capacitor ou React Native (mobile)**

Ou uma abordagem mais simples e unificada:

**Opção A — PWA (Progressive Web App)**
- Transforma o HTML em instalável no celular e desktop
- Funciona offline com Service Worker
- Banco de dados local com IndexedDB (substitui localStorage para volumes maiores)
- Sem App Store, instalado direto pelo navegador
- Menor esforço de migração — evolui o que já existe

**Opção B — Tauri (desktop) + PWA (mobile)**
- App nativo leve para Mac/Windows/Linux usando Rust + HTML/CSS/JS
- Bem menor que Electron, mais rápido
- Para mobile, continua como PWA ou Capacitor
- Banco de dados local SQLite

**Recomendação:** começar pela PWA (Opção A) — menor atrito, zero reescrita, e já funciona no celular hoje.

---

### Fase 3 — Inteligência com API do Claude

#### 3.1 "O que posso cozinhar?" (Chef do que tenho)
- Campo de texto livre: "tenho frango, alho, limão, creme de leite e mostarda"
- Chamada à API da Anthropic (`claude-sonnet-4-6`)
- Claude analisa os ingredientes informados, cruza com as receitas do repositório e sugere:
  - Receitas completas que já existem no app
  - Adaptações possíveis (ex: "falta só o cogumelo para o strogonoff")
  - Sugestões de pratos novos com o que foi informado
- Resultado exibido inline no app

Exemplo de prompt base para a feature:
```
Você é um chef assistente. O usuário tem os seguintes ingredientes disponíveis: [lista].
No repositório de receitas dele existem as seguintes receitas: [JSON das receitas].
Sugira o que ele pode cozinhar, priorizando receitas do repositório e indicando o que falta para completar as que estão quase completas. Seja direto e prático.
```

#### 3.2 Adicionar receita por linguagem natural
- Usuário digita ou cola uma receita em qualquer formato (texto livre, foto, URL)
- Claude estrutura automaticamente nos campos corretos (nome, ingredientes, passos, tempo)
- Usuário revisa e confirma antes de salvar

#### 3.3 Sugestão de harmonização e substituições
- Dentro da receita aberta: "não tenho X, o que posso usar no lugar?"
- Claude sugere substituições com contexto culinário

#### 3.4 Planejamento semanal
- Usuário informa quantas pessoas e o período
- Claude monta um cardápio balanceado com as receitas do repositório
- Gera lista de compras consolidada da semana inteira

---

## Estrutura de dados atual (referência para migração)

```js
// Cada receita segue este schema:
{
  id: Number,           // único
  emoji: String,        // ícone visual
  name: String,
  category: String,     // "Minhas receitas" | "Molhos" | "Receitas de chefs"
  time: String,         // ex: "40 min"
  desc: String,         // descrição curta (2 linhas)
  ingredients: String[],
  steps: String[],
  // opcionais:
  mother: Boolean,      // molho mãe francês
  motherLabel: String,  // "Molho mãe"
  chef: String,         // nome do chef
  chefLabel: String,    // exibido no badge
  note: String,         // nota informativa no modal
}
```

---

## Para o Claude Code — instruções de continuidade

1. O arquivo `receitas.html` é o ponto de partida — toda a lógica está em um único arquivo
2. As receitas ficam no array `recipes` dentro do `<script>` — fácil de estender
3. Para adicionar receitas novas: seguir o schema acima e incrementar o `id`
4. IDs 101-199 → receitas pessoais; 201-299 → molhos; 301-399 → chefs
5. A faixa de IDs 400+ está reservada para receitas adicionadas dinamicamente pelo usuário
6. A primeira evolução recomendada é implementar `localStorage` para persistência e o formulário de adição de receitas
7. A segunda é converter para PWA (manifest.json + service worker)
8. A terceira é integrar a API do Claude para a feature "o que posso cozinhar?"

---

## Variáveis de ambiente necessárias (Fase 3)

```
ANTHROPIC_API_KEY=sk-...
```

A chave pode ser injetada via Electron/Tauri como variável de ambiente ou configurada pelo usuário na primeira abertura do app em um painel de configurações.

---

_Documento gerado em julho de 2025. Projeto pessoal — Matheus._
