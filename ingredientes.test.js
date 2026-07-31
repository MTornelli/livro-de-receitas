/* ===========================================================================
 *  Testes do interpretador de ingredientes.
 *  Sem dependências — rode com:  node ingredientes.test.js
 * ======================================================================== */
const I = require('./ingredientes.js');

let ok = 0, falhas = [];
function eq(desc, obtido, esperado) {
  const a = JSON.stringify(obtido), b = JSON.stringify(esperado);
  if (a === b) ok++;
  else falhas.push(`${desc}\n      esperado: ${b}\n      obtido:   ${a}`);
}
function grupo(nome) { console.log('\n▸ ' + nome); }

// Atalhos para ler o resultado de uma linha só.
const nome1 = l => (I.interpretar(l)[0] || {}).nome;
const nomes = l => I.interpretar(l).map(e => e.nome);
const secao1 = l => (I.interpretar(l)[0] || {}).secao.id;
const qtd1 = l => { const e = I.interpretar(l)[0] || {}; return [e.qtd, e.familia]; };

// Monta uma lista a partir de linhas soltas, como se fossem uma receita.
function lista(linhas) {
  return I.montarLista([{ name: 'Receita', ingredients: linhas }])
    .flatMap(s => s.itens.map(i => (i.quantidade ? i.quantidade + ' ' : '') + i.nome));
}

grupo('Quantidade e unidade');
eq('massa em gramas',        qtd1('100g de manteiga'),        [100, 'massa']);
eq('quilo vira grama',       qtd1('1kg de filé mignon'),      [1000, 'massa']);
eq('volume em ml',           qtd1('500ml de leite integral'), [500, 'volume']);
eq('litro vira ml',          qtd1('1L de fundo de carne'),    [1000, 'volume']);
eq('colheres',               qtd1('2 colheres de manteiga'),  [2, 'colher']);
eq('dentes',                 qtd1('4 dentes de alho'),        [4, 'dente']);
eq('contagem sem unidade',   qtd1('2 cenouras'),              [2, 'un']);
eq('sem quantidade',         qtd1('Alho a gosto'),            [null, undefined]);

grupo('Regressão: a regex não pode comer a última letra');
// "1 cebola" já saiu como "cebol" + "a", porque o grupo do nome exigia
// ao menos um caractere e forçava a unidade a devolver uma letra.
eq('1 cebola',  nome1('1 cebola'),  'cebola');
eq('2 gemas',   nome1('2 gemas'),   'gema');
eq('1 limão',   nome1('1 limão'),   'limão');
eq('2 abobrinhas', nome1('2 abobrinhas'), 'abobrinha');

grupo('Ruído — o que descreve o uso, não a compra');
eq('a gosto',      nome1('Salsinha a gosto'),          'salsinha');
eq('parêntese',    nome1('1 gema (opcional, para enriquecer)'), 'gema');
eq('por pessoa',   nome1('3 ovos por pessoa'),         'ovo');
eq('para servir',  nome1('Fatias de pão torrado para servir'), 'fatia de pão torrado');
eq('um pouco de',  nome1('Um pouco de cerveja'),       'cerveja');
eq('número solto', nome1('Raspas de 1 limão (gremolata)'), 'raspa de limão');

grupo('Linhas compostas');
eq('vírgula e "e"', nomes('Sal, pimenta e noz-moscada'), ['sal', 'pimenta', 'noz-moscada']);
eq('só "e"',        nomes('Sal e pimenta'),              ['sal', 'pimenta']);
eq('só vírgula',    nomes('Tomilho, louro'),             ['tomilho', 'louro']);
eq('com qualificador', nomes('Sal grosso e pimenta-do-reino'), ['sal grosso', 'pimenta-do-reino']);
// Não pode partir o que não é enumeração:
eq('não parte com quantidade', nomes('1 kg de filé mignon ou alcatra'), ['filé mignon']);
eq('não parte nome longo',     nomes('Creme de leite fresco'),          ['creme de leite fresco']);
eq('não parte buquê',          nomes('Buquê garni (louro, tomilho, salsa)'), ['buquê garni']);

grupo('Preparo sai, identidade do produto fica');
eq('ralado sai',      nome1('50g de parmesão ralado'),      'parmesão');
eq('picada sai',      nome1('2 echalotes picadas'),         'echalote');
eq('em cubos sai',    nome1('100g de bacon em cubos'),      'bacon');
eq('maduros sai',     nome1('4 tomates maduros'),           'tomate');
eq('grande sai',      nome1('1 cebola grande'),             'cebola');
eq('inteiro sai',     nome1('1 frango inteiro'),            'frango');
// Estas mudam o produto e precisam sobreviver — fundir mandaria comprar errado.
eq('clarificada fica', nome1('180g de manteiga clarificada'), 'manteiga clarificada');
eq('grosso fica',      nome1('Sal grosso'),                   'sal grosso');
eq('tinto fica',       nome1('200ml de vinho tinto seco'),    'vinho tinto seco');
eq('roxa fica',        nome1('1 cebola roxa'),                'cebola roxa');
eq('seco fica',        nome1('Estragão seco'),                'estragão seco');

grupo('Recipiente só é unidade quando vem "de" atrás');
// "2 filés de salmão" → medida.  "2 filés mignon" → corte da carne.
eq('filés de salmão', qtd1('2 filés de salmão'), [2, 'filé']);
eq('filés mignon',    nome1('2 filés mignon ou ribeye'), 'filé mignon');
eq('filés mignon qtd', qtd1('2 filés mignon ou ribeye'), [2, 'un']);

grupo('Medida com tamanho');
eq('colheres grandes de', nome1('2 colheres grandes de chocolate do padre'), 'chocolate do padre');
eq('mantém a colher',     qtd1('2 colheres grandes de chocolate do padre'), [2, 'colher']);

grupo('Plural');
eq('ões → ão',    nome1('2 pimentões vermelhos'), 'pimentão vermelho');
eq('acentuada',   I.canonizar('filés'),        'filé');
eq('Paris fica',  nome1('1 bandeja de cogumelo Paris'), 'cogumelo paris');

grupo('Soma de quantidades');
eq('mesma família soma', lista(['100g de manteiga', '50g de manteiga']), ['150 g Manteiga']);
eq('gramas viram kg',    lista(['600g de manteiga', '500g de manteiga']), ['1.1 kg Manteiga']);
eq('ml viram litro',     lista(['500ml de fundo de carne', '600ml de fundo de carne']), ['1.1 L Fundo de carne']);
eq('contagem soma',      lista(['2 gemas', '3 gemas', '6 gemas']), ['11 Gema']);
// Famílias incompatíveis não podem virar um número só; aparecem lado a lado,
// na ordem em que surgiram nas receitas.
eq('famílias separadas', lista(['100g de manteiga', '2 colheres de manteiga']), ['100 g + 2 colheres Manteiga']);
eq('sem quantidade some com quem tem',
   lista(['Manteiga a gosto', '50g de manteiga']), ['50 g Manteiga']);

grupo('Seções');
eq('legume',   secao1('2 cenouras'),              'hortifruti');
eq('fruta',    secao1('1 limão'),                 'frutas');
eq('carne',    secao1('1kg de filé mignon'),      'carnes');
eq('laticínio',secao1('100g de manteiga'),        'laticinios');
eq('tempero',  secao1('Sal a gosto'),             'temperos');
eq('molho',    secao1('Azeite'),                  'molhos');
eq('doce',     secao1('1 lata de leite condensado'), 'doces');
// O substantivo que abre o nome manda:
eq('fundo de carne é caldo',    secao1('1L de fundo de carne'),  'liquidos');
eq('extrato de tomate é molho', secao1('2 colheres de extrato de tomate'), 'molhos');
eq('vinagre de vinho é molho',  secao1('50ml de vinagre de vinho branco'), 'molhos');
// "sal" não pode capturar "salsão":
eq('salsão é legume',  secao1('2 talos de salsão'), 'hortifruti');
eq('salsinha é tempero', secao1('Salsinha'),        'temperos');

grupo('Lista vazia e entradas degeneradas');
eq('linha vazia',    I.interpretar(''),        []);
eq('só espaços',     I.interpretar('   '),     []);
eq('só ruído',       I.interpretar('a gosto'), []);
eq('nulo',           I.interpretar(null),      []);

// ── Resultado ───────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
if (falhas.length) {
  console.log(`❌ ${falhas.length} falha(s), ${ok} passaram\n`);
  falhas.forEach(f => console.log('  ✗ ' + f + '\n'));
  process.exit(1);
}
console.log(`✅ ${ok} verificações passaram`);
