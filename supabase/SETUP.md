# Sincronizar as receitas entre aparelhos

Sem essa configuração o app continua funcionando normalmente, só que cada
aparelho guarda as próprias receitas no navegador. Depois dela, você entra com o
seu e-mail e as receitas passam a acompanhar você no celular e no computador.

São quatro passos, todos no painel do Supabase, e leva uns 10 minutos.

---

## 1. Criar a tabela

No painel do seu projeto, abra **SQL Editor → New query**, cole o conteúdo
inteiro de [`schema.sql`](./schema.sql) e clique em **Run**.

Isso cria a tabela `recipes` e — o mais importante — liga o **Row Level
Security**, que é o que garante que cada pessoa só alcança as próprias receitas.
Pode rodar de novo quantas vezes quiser, não duplica nada.

Para conferir, vá em **Table Editor**: a tabela `recipes` deve aparecer com o
cadeado de RLS ativo.

---

## 2. Pegar as credenciais

Em **Project Settings → API**, copie dois valores:

| Campo no painel | Onde vai no código |
|---|---|
| **Project URL** (`https://xxxx.supabase.co`) | `SUPABASE_URL` |
| **anon public** / **publishable key** | `SUPABASE_ANON_KEY` |

> ⚠️ **Use só a chave `anon`.** Existe também uma `service_role` (às vezes
> chamada de *secret*) na mesma tela: ela **ignora o RLS** e daria acesso total
> ao banco para quem abrisse o código do site. Ela nunca deve sair do painel.

A chave `anon` é pública por natureza — ela vai para dentro do `index.html` e
qualquer visitante consegue lê-la. Isso é o funcionamento normal do Supabase:
quem protege os dados é o RLS do passo 1, não o segredo da chave.

---

## 3. Preencher no app

Abra o `index.html` e preencha as duas linhas logo no começo do `<script>`
(por volta da linha 280):

```js
const SUPABASE_URL      = 'https://xxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGci...';
```

---

## 4. Liberar os endereços de login

O link de acesso enviado por e-mail só funciona para endereços que o Supabase
conhece. Em **Authentication → URL Configuration**:

- **Site URL**: o endereço onde o app está publicado
  (ex.: `https://mtornelli.github.io/livro-de-receitas/`)
- **Redirect URLs**: adicione o mesmo endereço e, se quiser testar na sua
  máquina, também `http://localhost:8000/index.html`

Sem isso o clique no e-mail devolve um erro de *redirect not allowed*.

---

## Como testar

Rode um servidor local na pasta do projeto — abrir o arquivo direto pelo
`file://` **não funciona** para o login:

```sh
python3 -m http.server 8000
# abra http://localhost:8000/index.html
```

Roteiro sugerido:

1. Clique em **Sincronizar** e informe seu e-mail.
2. Abra o e-mail **no mesmo navegador** e clique no link.
3. O botão passa a mostrar **Nuvem** e aparece a etiqueta *Tudo sincronizado*.
4. Em **Table Editor → recipes**, confira que as receitas que já existiam no
   aparelho subiram sozinhas.
5. Crie uma receita nova e recarregue a página — ela tem que continuar lá.
6. Entre com o mesmo e-mail em outro aparelho: as receitas aparecem.

---

## Como funciona por baixo

- O `localStorage` continua sendo o que a tela lê, então o app **abre instantâneo
  e funciona offline**, logado ou não.
- Havendo sessão, cada criação, importação e exclusão também vai para o
  Supabase, e ao abrir o app a nuvem é baixada por cima do cache local.
- Cada receita leva consigo o `id` que já tinha no aparelho (`local_id` no
  banco). É isso que faz a migração poder rodar várias vezes sem duplicar, e o
  que mantém a lista de compras funcionando sem alteração.
- A migração automática só acontece se o cache local ainda não pertence a outra
  conta — assim as receitas de uma pessoa não vazam para a conta de outra em um
  aparelho compartilhado.
- Sincroniza **apenas as receitas**. Lista de compras, itens marcados e o "tenho
  em casa" continuam locais de cada aparelho, como combinado.

## Se algo der errado

| Sintoma | Causa provável |
|---|---|
| Botão **Sincronizar** não aparece | As duas constantes do passo 3 estão vazias |
| Etiqueta laranja *Falha ao sincronizar* | O `schema.sql` não foi rodado, ou o RLS está bloqueando. Veja o erro no console do navegador |
| Link do e-mail dá *redirect not allowed* | Faltou cadastrar o endereço no passo 4 |
| Receitas não sobem | Confira em **Table Editor** se a tabela `recipes` existe e tem RLS ligado |
