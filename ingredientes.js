/* ===========================================================================
 *  Interpretação de ingredientes para a lista de compras
 *
 *  Recebe as linhas soltas que as receitas trazem ("100g de manteiga",
 *  "Sal, pimenta e noz-moscada", "Alho a gosto") e devolve itens de compra
 *  agrupados por seção de mercado, com as quantidades somadas.
 *
 *  Roda no navegador como script simples e também sob Node, para os testes.
 * ======================================================================== */
(function (root) {
'use strict';

// ── Ruído ───────────────────────────────────────────────────────────────────
// Trechos que descrevem o uso, não o que se compra. Saem antes de qualquer
// outra coisa, porque atrapalham inclusive a separação de linhas compostas.
const RUIDO = [
  /\s*\([^)]*\)/g,                    // qualquer parêntese: (opcional), (±180g cada)
  /\ba gosto\b/gi,
  /\bpor pessoa\b/gi,
  /\bpara servir\b/gi,
  /\bpara a água do cozimento\b/gi,
  /\bpara caramelizar\b/gi,
  /\bpara enriquecer\b/gi,
  /\bopcional\b/gi,
  /\bum pouco de\b/gi,
  /\baproximadamente\b/gi,
  /\bcerca de\b/gi,
  /\bse (?:quiser|desejar)\b/gi
];

// ── Preparo ─────────────────────────────────────────────────────────────────
// Como o ingrediente é cortado ou tratado. Não muda o que se põe no carrinho:
// "alho batido" e "alho" são a mesma compra, então some para poder agregar.
//
// Cuidado deliberado: palavras que mudam o PRODUTO ficam de fora desta lista.
// "manteiga clarificada", "sal grosso", "vinho tinto" e "estragão seco" são
// compras distintas de "manteiga", "sal", "vinho" e "estragão" — fundir
// mandaria a pessoa ao mercado com a informação errada.
const PREPARO = new RegExp(
  '\\b(' + [
    'ralad[oa]s?', 'picad[oa]s?', 'fatiad[oa]s?', 'batid[oa]s?', 'moíd[oa]s?',
    'moid[oa]s?', 'amolecid[oa]s?', 'gelad[oa]s?', 'derretid[oa]s?',
    'triturad[oa]s?', 'cortad[oa]s?', 'variad[oa]s?', 'pront[oa]s?',
    'inteir[oa]s?', 'bem', 'fin[oa]s?', 'grandes?', 'pequen[oa]s?',
    'madur[oa]s?',
    'em cubos', 'em rodelas', 'em grão', 'com casca', 'sem capa'
  ].join('|') + ')\\b', 'gi');

// ── Unidades ────────────────────────────────────────────────────────────────
// Cada família só soma dentro de si. Gramas viram gramas, mililitros viram
// mililitros, e colheres continuam colheres — misturar seria inventar dado.
const UNIDADES = [
  { re: /^(kg|quilos?)$/i,            familia: 'massa',  fator: 1000 },
  { re: /^(g|gr|gramas?)$/i,          familia: 'massa', fator: 1 },
  { re: /^(l|lt|litros?)$/i,          familia: 'volume', fator: 1000 },
  { re: /^(ml|mls)$/i,                familia: 'volume', fator: 1 },
  { re: /^colher(es)?$/i,             familia: 'colher', fator: 1 },
  { re: /^x[ií]caras?$/i,             familia: 'xícara', fator: 1 },
  { re: /^dentes?$/i,                 familia: 'dente', exigeDe: true, fator: 1 },
  { re: /^talos?$/i,                  familia: 'talo', exigeDe: true, fator: 1 },
  { re: /^favas?$/i,                  familia: 'fava', exigeDe: true, fator: 1 },
  { re: /^latas?$/i,                  familia: 'lata', exigeDe: true, fator: 1 },
  { re: /^bandejas?$/i,               familia: 'bandeja', exigeDe: true,fator: 1 },
  { re: /^fil[ée]s?$/i,               familia: 'filé', exigeDe: true, fator: 1 },
  { re: /^ma[çc]os?$/i,               familia: 'maço', exigeDe: true, fator: 1 },
  { re: /^fatias?$/i,                 familia: 'fatia', exigeDe: true, fator: 1 },
  { re: /^ramos?$/i,                  familia: 'ramo', exigeDe: true, fator: 1 },
  { re: /^pitadas?$/i,                familia: 'pitada', fator: 1 },
  { re: /^punhados?$/i,               familia: 'punhado',fator: 1 }
];

const PLURAL_FAMILIA = {
  colher: ['colher', 'colheres'], 'xícara': ['xícara', 'xícaras'],
  dente: ['dente', 'dentes'], talo: ['talo', 'talos'], fava: ['fava', 'favas'],
  lata: ['lata', 'latas'], bandeja: ['bandeja', 'bandejas'],
  'filé': ['filé', 'filés'], 'maço': ['maço', 'maços'],
  fatia: ['fatia', 'fatias'], ramo: ['ramo', 'ramos'],
  pitada: ['pitada', 'pitadas'], punhado: ['punhado', 'punhados'],
  un: ['', '']
};

// ── Seções de mercado ───────────────────────────────────────────────────────
// A ordem aqui é a ordem em que os blocos aparecem na tela, pensada para
// seguir grosso modo o trajeto dentro de um mercado.
const SECOES = [
  { id: 'hortifruti', nome: 'Legumes e verduras', emoji: '🥬', termos: [
    'cebola', 'cebola roxa', 'alho', 'cenoura', 'abobrinha', 'berinjela',
    'tomate', 'pimentão', 'salsão', 'echalote', 'chalota', 'cogumelo',
    'champignon', 'mirepoix', 'batata', 'alho-poró', 'aipo', 'pepino',
    'abóbora', 'couve', 'alface', 'espinafre', 'brócolis', 'milho', 'ervilha' ] },

  { id: 'frutas', nome: 'Frutas', emoji: '🍋', termos: [
    'limão', 'laranja', 'maçã', 'banana', 'morango', 'abacaxi', 'manga',
    'uva', 'pera', 'maracujá', 'coco' ] },

  { id: 'carnes', nome: 'Carnes e peixes', emoji: '🥩', termos: [
    'filé mignon', 'alcatra', 'ribeye', 'picanha', 'carne', 'frango',
    'salmão', 'peixe', 'bacon', 'linguiça', 'tutano', 'costela', 'coração',
    'camarão', 'presunto', 'vitela', 'cordeiro', 'porco', 'lombo' ] },

  { id: 'laticinios', nome: 'Laticínios e ovos', emoji: '🥛', termos: [
    'manteiga', 'creme de leite', 'leite', 'queijo', 'parmesão', 'pecorino',
    'gruyère', 'gruyere', 'mussarela', 'gema', 'ovo', 'crème fraîche',
    'creme fraiche', 'cream cheese', 'requeijão', 'iogurte', 'nata', 'ghee' ] },

  { id: 'mercearia', nome: 'Grãos, massas e pães', emoji: '🌾', termos: [
    'farinha', 'espaguete', 'tonnarelli', 'macarrão', 'massa', 'pão',
    'arroz', 'feijão', 'lentilha', 'grão-de-bico', 'aveia', 'polenta',
    'fubá', 'amido', 'torrada' ] },

  { id: 'temperos', nome: 'Temperos e ervas', emoji: '🌿', termos: [
    'sal', 'pimenta', 'noz-moscada', 'alecrim', 'tomilho', 'louro',
    'orégano', 'estragão', 'salsinha', 'salsa', 'cebolinha', 'coentro',
    'manjericão', 'buquê garni', 'tempero', 'cajun', 'chimichurri',
    'gremolata', 'páprica', 'açafrão', 'curry', 'cominho', 'canela',
    'cravo', 'gengibre', 'baunilha' ] },

  { id: 'molhos', nome: 'Óleos, vinagres e molhos', emoji: '🫒', termos: [
    'azeite', 'óleo', 'vinagre', 'shoyu', 'mostarda', 'maionese', 'ketchup',
    'extrato de tomate', 'molho', 'tahine', 'gergelim' ] },

  { id: 'liquidos', nome: 'Bebidas e caldos', emoji: '🍷', termos: [
    'vinho', 'cerveja', 'água', 'caldo', 'fundo', 'demi-glace', 'béchamel',
    'bechamel', 'velouté', 'veloute', 'espagnole', 'suco', 'conhaque',
    'rum', 'cachaça', 'whisky' ] },

  { id: 'doces', nome: 'Doces e confeitaria', emoji: '🍫', termos: [
    'açúcar', 'chocolate', 'leite condensado', 'mel', 'cacau', 'doce de leite',
    'granulado', 'essência' ] },

  { id: 'outros', nome: 'Outros', emoji: '📦', termos: [] }
];

// ── Utilidades ──────────────────────────────────────────────────────────────
function semAcento(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Singulariza para que "2 cenouras" e "1 cenoura" caiam no mesmo item.
function singular(p) {
  if (p.length <= 3) return p;
  if (/ões$/i.test(p)) return p.replace(/ões$/i, 'ão');
  if (/ães$/i.test(p)) return p.replace(/ães$/i, 'ão');
  if (/ais$/i.test(p)) return p.replace(/ais$/i, 'al');
  if (/éis$/i.test(p)) return p.replace(/éis$/i, 'el');
  if (/eis$/i.test(p)) return p.replace(/eis$/i, 'el');
  if (/ns$/i.test(p))  return p.replace(/ns$/i, 'm');
  if (/[rzs]es$/i.test(p)) return p.replace(/es$/i, '');
  // Vogais acentuadas contam: sem elas "filés" não virava "filé" e o corte
  // aparecia solto em Outros. O 'i' fica de fora de propósito, porque pegaria
  // nomes próprios e palavras invariáveis como "Paris" e "anis".
  if (/[aeouáéóúâêôà]s$/i.test(p)) return p.replace(/s$/i, '');
  return p;
}

function singularFrase(f) {
  return f.split(/\s+/).map(singular).join(' ');
}

function limpar(txt) {
  let t = ' ' + txt + ' ';
  RUIDO.forEach(re => { t = t.replace(re, ' '); });
  return t.replace(/\s+/g, ' ').replace(/^[\s,;.-]+|[\s,;.-]+$/g, '').trim();
}

// ── Linhas compostas ────────────────────────────────────────────────────────
// "Sal, pimenta e noz-moscada" são três compras. Mas "1 kg de filé mignon ou
// alcatra" é uma só, e "Creme de leite fresco" não pode ser partido.
// Só separa quando não há quantidade e cada pedaço resultante é curto — o que
// caracteriza a enumeração de temperos, que é o caso real que aparece.
function separarCompostos(txt) {
  if (/\d/.test(txt)) return [txt];
  if (!/,| e /i.test(txt)) return [txt];
  const partes = txt.split(/\s*,\s*|\s+e\s+/i).map(s => s.trim()).filter(Boolean);
  if (partes.length < 2) return [txt];
  if (partes.some(p => p.split(/\s+/).length > 2)) return [txt];
  return partes;
}

// ── Quantidade ──────────────────────────────────────────────────────────────
// O terceiro grupo aceita vazio de propósito. Exigindo ao menos um caractere,
// "1 cebola" forçava a regex a devolver uma letra para ele e o nome saía
// partido em "cebol" + "a".
const RE_QTD = /^(\d+(?:[.,]\d+)?)\s*([a-zA-ZçÇãáéíóúâêôõüÀ-ÿ]+)?\s*(.*)$/;

const RE_DE = /^d[eoa]s?\s+/i;
// "colheres grandes de", "colher de sopa de": tamanho da medida, não ingrediente.
const RE_MEDIDA = /^(?:(grandes?|pequen[oa]s?|cheias?|rasas?|sopa|ch[áa]|caf[ée])\s+)+(?:d[eoa]s?\s+)?/i;

function extrairQuantidade(txt) {
  const m = txt.match(RE_QTD);
  if (!m) return { qtd: null, familia: null, nome: txt };

  const num = parseFloat(m[1].replace(',', '.'));
  const palavra = m[2] || '';
  let resto = (m[3] || '').trim();

  const achada = UNIDADES.find(u => u.re.test(palavra));
  // Unidades de recipiente ("filé", "dente", "lata") só contam como medida
  // quando vem um "de" atrás. Sem isso, "2 filés mignon" perderia o corte e
  // viraria apenas "mignon".
  if (achada && (!achada.exigeDe || RE_DE.test(resto))) {
    resto = resto.replace(RE_DE, '').replace(RE_MEDIDA, '');
    return { qtd: num * achada.fator, familia: achada.familia, nome: resto.trim() };
  }
  // Não era unidade: a palavra faz parte do nome. "2 cenouras", "1 limão".
  const nome = (palavra ? palavra + ' ' : '') + resto;
  return { qtd: num, familia: 'un', nome: nome.trim() };
}

// ── Nome canônico ───────────────────────────────────────────────────────────
function canonizar(nome) {
  let n = nome.toLowerCase();
  n = n.split(/\s+ou\s+/)[0];              // "filé mignon ou alcatra" → o primeiro
  n = n.replace(PREPARO, ' ');
  n = n.replace(/\b\d+([.,]\d+)?\b/g, ' '); // número solto no meio: "raspas de 1 limão"
  n = n.replace(/\s+/g, ' ').replace(/^[\s,;.-]+|[\s,;.-]+$/g, '').trim();
  n = singularFrase(n);
  return n;
}

function classificar(nomeCanonico) {
  const alvo = semAcento(nomeCanonico).toLowerCase();
  let melhor = null, melhorPontos = -1;
  for (const secao of SECOES) {
    for (const termo of secao.termos) {
      const t = semAcento(termo).toLowerCase();
      // Casa por palavra inteira, para "sal" não capturar "salsão".
      const re = new RegExp('(^|\\s|-)' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|\\s|-)');
      const achou = alvo.match(re);
      if (!achou) continue;
      // O substantivo que abre o nome manda: "fundo de carne" é caldo, não
      // carne. Empatando na posição, vence o termo mais específico.
      const pontos = (achou.index === 0 ? 1000 : 0) + t.length;
      if (pontos > melhorPontos) { melhor = secao; melhorPontos = pontos; }
    }
  }
  return melhor || SECOES[SECOES.length - 1];
}

// ── API ─────────────────────────────────────────────────────────────────────
function interpretar(linha) {
  const base = limpar(String(linha || ''));
  if (!base) return [];
  return separarCompostos(base).map(parte => {
    const { qtd, familia, nome } = extrairQuantidade(parte.trim());
    const canonico = canonizar(nome);
    if (!canonico) return null;
    return {
      chave: semAcento(canonico),
      nome: canonico,
      qtd: qtd,
      familia: familia,
      secao: classificar(canonico)
    };
  }).filter(Boolean);
}

function formatarQuantidade(familia, total) {
  if (familia === 'massa') {
    return total >= 1000 ? +(total / 1000).toFixed(2) + ' kg' : +total.toFixed(0) + ' g';
  }
  if (familia === 'volume') {
    return total >= 1000 ? +(total / 1000).toFixed(2) + ' L' : +total.toFixed(0) + ' ml';
  }
  const n = +total.toFixed(2);
  if (familia === 'un') return String(n);
  const [sing, plur] = PLURAL_FAMILIA[familia] || [familia, familia];
  return n + ' ' + (n === 1 ? sing : plur);
}

// Recebe [{ingredientes:[...], nome:'Receita'}] e devolve as seções preenchidas.
function montarLista(receitas) {
  const itens = {};
  receitas.forEach(r => {
    (r.ingredients || []).forEach(linha => {
      interpretar(linha).forEach(e => {
        if (!itens[e.chave]) {
          itens[e.chave] = { chave: e.chave, nome: e.nome, secao: e.secao,
                             quantidades: {}, receitas: new Set() };
        }
        const it = itens[e.chave];
        it.receitas.add(r.name);
        if (e.qtd != null) {
          it.quantidades[e.familia] = (it.quantidades[e.familia] || 0) + e.qtd;
        }
      });
    });
  });

  const lista = Object.values(itens).map(it => ({
    chave: it.chave,
    nome: it.nome.charAt(0).toUpperCase() + it.nome.slice(1),
    secao: it.secao,
    receitas: [...it.receitas],
    // Famílias incompatíveis não se somam: viram "150 g + 2 colheres".
    quantidade: Object.keys(it.quantidades)
      .map(f => formatarQuantidade(f, it.quantidades[f]))
      .join(' + ')
  }));

  return SECOES
    .map(secao => ({
      ...secao,
      itens: lista.filter(i => i.secao.id === secao.id)
                  .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
    }))
    .filter(s => s.itens.length);
}

const API = { interpretar, montarLista, formatarQuantidade, canonizar, classificar, SECOES };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else root.Ingredientes = API;

})(typeof globalThis !== 'undefined' ? globalThis : this);
