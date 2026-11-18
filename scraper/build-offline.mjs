// Uso: node scraper/build-offline.mjs  ->  dist/farm-tracker-offline.html (un unico file, dati inclusi)
// Il file contiene i dati degli oggetti: usalo in privato e non ripubblicarlo senza il permesso di MetaForge.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildOffline } from './offline.mjs';

const root = new URL('../', import.meta.url);
const readJson = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
let overrides = {};
try { overrides = readJson('data/overrides.json'); } catch (e) { /* facoltativo */ }

const html = buildOffline(readFileSync(new URL('index.html', root), 'utf8'), {
  meta: readJson('data/meta.json'), items: readJson('data/items.json'), overrides,
});
mkdirSync(new URL('dist/', root), { recursive: true });
const out = new URL('dist/farm-tracker-offline.html', root);
writeFileSync(out, html);
console.log(`Creato ${out.pathname.slice(1)} (${Math.round(html.length / 1024)} KB)`);
