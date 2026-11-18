// Uso: node scraper/run.mjs   (PW_CHANNEL=msedge per usare Edge in locale)
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { withBrowser } from './browser.mjs';
import { crawlAll } from './crawl.mjs';
import { validate } from './validate.mjs';
import { writeData } from './write.mjs';

const dataDir = fileURLToPath(new URL('../data/', import.meta.url));
const prevFile = join(dataDir, 'items.json');
const prev = existsSync(prevFile) ? JSON.parse(readFileSync(prevFile, 'utf8')) : {};

const next = await withBrowser((getHtml) => crawlAll(getHtml, { log: (m) => console.error(m) }));
const errors = validate(next, prev);
if (errors.length) {
  console.error(`Guardie fallite (${errors.length}), nessun dato scritto:`);
  errors.slice(0, 50).forEach((e) => console.error('  ' + e));
  process.exit(1);
}
const { changed } = writeData(dataDir, next);
console.log(changed ? `Dati aggiornati: ${Object.keys(next).length} oggetti` : 'Nessuna modifica');
