import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Scrive data/items.json (chiavi ordinate) e data/meta.json. Se items.json non cambia non tocca nessun file,
// così `git diff data/` resta vuoto e l'Action non committa.
export function writeData(dir, items, now = new Date()) {
  const sorted = Object.fromEntries(Object.keys(items).sort().map((id) => [id, items[id]]));
  const text = JSON.stringify(sorted, null, 2) + '\n';
  const file = join(dir, 'items.json');
  const prev = existsSync(file) ? readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : null;
  if (prev === text) return { changed: false };
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, text);
  const meta = { updatedAt: now.toISOString(), count: Object.keys(sorted).length, schema: 1 };
  writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
  return { changed: true };
}
