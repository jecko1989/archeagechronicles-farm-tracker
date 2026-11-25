import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Scrive data/items.json (chiavi ordinate) e data/meta.json. Se items.json non cambia e la data dell'ultima patch note
// (patch, YYYY-MM-DD, facoltativa) è la stessa non tocca nessun file, così `git diff data/` resta vuoto e l'Action non committa.
// Se patch è null (pagina non letta) si tiene quella già in meta.json.
export function writeData(dir, items, now = new Date(), patch = null) {
  const sorted = Object.fromEntries(Object.keys(items).sort().map((id) => [id, items[id]]));
  const text = JSON.stringify(sorted, null, 2) + '\n';
  const file = join(dir, 'items.json');
  const metaFile = join(dir, 'meta.json');
  const prev = existsSync(file) ? readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : null;
  let prevMeta = {};
  try { prevMeta = JSON.parse(readFileSync(metaFile, 'utf8')); } catch (e) { /* assente o rotto: si riscrive */ }
  const patchChanged = !!patch && prevMeta.patch !== patch;
  if (prev === text && !patchChanged) return { changed: false };
  mkdirSync(dir, { recursive: true });
  if (prev !== text) writeFileSync(file, text);
  const keep = patch || prevMeta.patch;
  const meta = { updatedAt: now.toISOString(), count: Object.keys(sorted).length, schema: 1, ...(keep ? { patch: keep } : {}) };
  writeFileSync(metaFile, JSON.stringify(meta, null, 2) + '\n');
  return { changed: true };
}
