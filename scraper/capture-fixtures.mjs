// Una tantum: salva l'HTML di alcune pagine reali in scraper/tests/fixtures/ per i test del parser.
// Uso: PW_CHANNEL=msedge node scraper/capture-fixtures.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { BASE, withBrowser } from './browser.mjs';

const PAGES = {
  'cultist-hood': '/database/armor/cultist-hood',
  'standard-textile': '/database/materials/standard-textile',
  'listing-armor-1': '/database/armor/page/1',
  'lifeflow-potion': '/database/consumables/lifeflow-potion', // yield 5 + tre stazioni "A, B or C"
  'city-guard-longsword': '/database/weapons/city-guard-longsword', // arma: statistiche diverse dall'armatura
};

mkdirSync(new URL('./tests/fixtures/', import.meta.url), { recursive: true });
await withBrowser(async (getHtml) => {
  for (const [name, path] of Object.entries(PAGES)) {
    writeFileSync(new URL(`./tests/fixtures/${name}.html`, import.meta.url), await getHtml(BASE + path));
    console.log('saved', name);
  }
});

// no-gold: copia di cultist-hood senza la frase "Costs 3,000 Gold" (per il test del gold mancante)
const hood = readFileSync(new URL('./tests/fixtures/cultist-hood.html', import.meta.url), 'utf8');
const stripped = hood.replace(/<!--\[0-->Costs <span[^>]*>3,000<\/span> Gold\.<!--\]-->/, '');
if (stripped === hood) throw new Error('no-gold: frase "Costs" non trovata, il layout della pagina è cambiato');
writeFileSync(new URL('./tests/fixtures/no-gold.html', import.meta.url), stripped);
console.log('saved no-gold');
