import * as cheerio from 'cheerio';

const norm = (s) => s.replace(/\s+/g, ' ').trim();

// Valore della riga <dt>etichetta</dt><dd>valore</dd>; prova le etichette nell'ordine dato.
function label($, names) {
  for (const n of names) {
    const dt = $('dt').filter((_, e) => norm($(e).text()) === n).first();
    if (dt.length) return norm(dt.next().text());
  }
  return '';
}

// Ogni sezione "How to Craft …" ha: <p>Crafted at the A or B with Prof level N. Costs G Gold.</p> + <ul> di "N x <link>".
// self = slug dell'oggetto: nelle case/annessi la lista ingredienti inizia con "1 x <l'oggetto stesso>", che è il prodotto.
function parseCrafts($, self) {
  const crafts = [];
  const refs = [];
  $('h2').filter((_, e) => /^How to Craft/.test(norm($(e).text()))).each((_, h2) => {
    let current = null;
    $(h2).nextUntil('h2').each((_, el) => {
      const $el = $(el);
      if (el.tagName === 'p' && /^Crafted/.test(norm($el.text()))) {
        const text = norm($el.text());
        const m = text.match(/^Crafted at the (.+?) with (.+?) level (\d+)/);
        const g = text.match(/Costs ([\d,]+) Gold/);
        const y = text.match(/You.ll receive (\d+) per craft/); // es. pozioni: 5 pezzi per craft
        // frase non riconosciuta -> professione vuota: la guardia dello scraper la segnala
        current = {
          profession: m ? m[2] : '', level: m ? Number(m[3]) : 0,
          stations: m ? m[1].split(/,\s*|\s+or\s+/) : [], // "A, B or C"
          gold: g ? Number(g[1].replace(/,/g, '')) : 0, ...(y ? { yield: Number(y[1]) } : {}), ingredients: [],
        };
        crafts.push(current);
      } else if (el.tagName === 'ul' && current) {
        $el.find('li').each((_, li) => {
          const q = norm($(li).text()).match(/^(\d[\d,]*) x /);
          const href = $(li).find('a').first().attr('href');
          if (!q || !href) return;
          const parts = href.split('/').filter(Boolean);
          const ref = { id: parts[parts.length - 1], category: parts[parts.length - 2] };
          if (ref.id === self) return; // è il prodotto, non un ingrediente
          current.ingredients.push({ id: ref.id, qty: Number(q[1].replace(/,/g, '')) });
          if (!refs.some((r) => r.id === ref.id)) refs.push(ref);
        });
      }
    });
  });
  return { crafts, refs };
}

// Dati per il tooltip, come nel pannello di MetaForge: righe di dettaglio (livello, slot, set, peso, durabilità,
// prezzo…), statistiche (a "Untempered"), opzioni casuali e descrizione. Omette ciò che la pagina non ha.
function parseInfo($, typeLabel) {
  const skip = new Set(['Category', 'Rarity', typeLabel]); // già nei campi dell'oggetto
  const rows = [];
  $('dl').first().find('> div').each((_, d) => {
    const k = norm($(d).find('dt').first().text());
    const v = norm($(d).find('dd').first().text());
    if (k && v && !skip.has(k)) rows.push([k, v]);
  });
  const section = (title) => $('h2').filter((_, e) => new RegExp('^' + title).test(norm($(e).text()))).first().parent();
  // righe "etichetta ... valore": hanno bordo tratteggiato (la barra del tempering +0/+10 no)
  const pairs = (sec) => {
    const out = [];
    sec.find('div[class*="border-dashed"]').each((_, d) => {
      const s = $(d).find('> span');
      if (s.length === 2) out.push([norm(s.first().text()), norm(s.last().text())]);
    });
    return out;
  };
  const info = {};
  const stats = pairs(section('Stats'));
  const random = pairs(section('Random Options'));
  const description = norm(section('Description').find('p').first().text());
  if (rows.length) info.rows = rows;
  if (stats.length) info.stats = stats;
  if (random.length) info.random = random;
  if (description) info.description = description;
  return Object.keys(info).length ? info : undefined;
}

// html: pagina oggetto di MetaForge. ctx.category: cartella dell'URL (armor, materials, ...).
export function parseItemPage(html, ctx) {
  const $ = cheerio.load(html);
  const { crafts, refs } = parseCrafts($, ctx.slug);
  const labels = $('dt').map((_, e) => norm($(e).text())).get();
  const typeLabel = ['Type', 'Armor Type'].find((n) => labels.includes(n)) || labels.find((n) => /Type$/.test(n)) || '';
  const type = (typeLabel && label($, [typeLabel])) || ctx.category;
  const info = parseInfo($, typeLabel);
  return {
    item: {
      name: norm($('h1').first().text()), category: ctx.category, rarity: label($, ['Rarity']), type, crafts,
      ...(info ? { info } : {}),
    },
    refs,
  };
}
