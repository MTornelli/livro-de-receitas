# vendor/

Dependência de terceiros copiada para dentro do repositório, e não carregada de
um CDN. São arquivos gerados — não edite à mão.

## supabase.js

- **Pacote:** [`@supabase/supabase-js`](https://github.com/supabase/supabase-js)
- **Versão:** 2.45.4
- **Licença:** MIT
- **Origem:** `node_modules/@supabase/supabase-js/dist/umd/supabase.js`
- **Global exportado:** `window.supabase`

`591.supabase.js` é um chunk auxiliar do bundle (um stub do `ws`, que só existe
para o Node). Precisa ficar ao lado do arquivo principal.

### Por que vendorizar em vez de usar CDN

1. O app é um PWA offline-first. Vindo de CDN, a sincronização só funcionaria
   depois de um primeiro carregamento online bem-sucedido.
2. É a biblioteca que cuida da sessão de login. Servida por terceiros, um
   comprometimento do CDN alcançaria os tokens de autenticação.
3. A versão fica fixada junto do código, sem mudar sozinha sob os pés do app.

### Como atualizar

```sh
npm install @supabase/supabase-js@<versão>
cp node_modules/@supabase/supabase-js/dist/umd/supabase.js      vendor/
cp node_modules/@supabase/supabase-js/dist/umd/591.supabase.js  vendor/
```

Depois é preciso subir o `CACHE_NAME` em `sw.js`, senão os aparelhos que já
abriram o app continuam servindo a versão antiga do cache.
