import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOffline } from '../offline.mjs';

const page = '<!doctype html><html><head></head><body><script id="config">const X = 1;</script><script id="core">/* core */</script></body></html>';
const data = {
  meta: { updatedAt: '2026-11-18T00:00:00Z', count: 1, schema: 1 },
  items: { a: { name: 'A </script><b>', crafts: [] } },
  overrides: { a: { note: 'n' } },
};

const embedded = (html) => {
  const m = html.match(/<script id="embedded-data" type="application\/json">([\s\S]*?)<\/script>/);
  return m ? JSON.parse(m[1]) : null;
};

test('inserisce i dati come JSON valido in <script id="embedded-data">', () => {
  const out = buildOffline(page, data);
  assert.deepEqual(embedded(out), data);
});

test('un "</script>" dentro i dati non chiude il tag (viene escapato)', () => {
  const out = buildOffline(page, data);
  const between = out.slice(out.indexOf('id="embedded-data"'), out.indexOf('<script id="config">'));
  assert.equal((between.match(/<\/script>/g) || []).length, 1); // solo quello di chiusura vero
  assert.equal(embedded(out).items.a.name, 'A </script><b>'); // e il dato resta identico
});

test('il resto della pagina resta invariato e i dati stanno prima della config', () => {
  const out = buildOffline(page, data);
  assert.ok(out.includes('<script id="core">/* core */</script>'));
  assert.ok(out.indexOf('id="embedded-data"') < out.indexOf('<script id="config">'));
});

test('applicare due volte sostituisce i dati invece di duplicarli', () => {
  const once = buildOffline(page, data);
  const twice = buildOffline(once, { ...data, items: {} });
  assert.equal((twice.match(/id="embedded-data"/g) || []).length, 1);
  assert.deepEqual(embedded(twice).items, {});
});

test('una menzione di <script id="embedded-data"> dentro un altro script non viene scambiata per i dati', () => {
  const tricky = '<html><body><script id="core">// i dati stanno in <script id="embedded-data"> se presenti\nconst keep = 1;</script><script id="config">x</script></body></html>';
  const out = buildOffline(tricky, data);
  assert.ok(out.includes('const keep = 1;'), 'il codice del core non deve sparire');
  assert.deepEqual(embedded(out), data);
  assert.ok(buildOffline(out, data).includes('const keep = 1;'), 'nemmeno alla seconda applicazione');
});

test('senza overrides usa un oggetto vuoto', () => {
  const out = buildOffline(page, { meta: data.meta, items: data.items });
  assert.deepEqual(embedded(out).overrides, {});
});

test('pagina senza <script id="config"> : errore chiaro', () => {
  assert.throws(() => buildOffline('<html></html>', data), /config/);
});
