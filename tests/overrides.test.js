const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore, loadSample, plain } = require('./load-core');

const core = loadCore();
const applyOverrides = (items, ov) => plain(core.applyOverrides(items, ov));
const meta = { updatedAt: 't1', count: 10, schema: 1 };

test('sostituisce gli ingredienti della prima ricetta e tiene gli altri campi', () => {
  const items = loadSample();
  const r = applyOverrides(items, { textile: { ingredients: [{ id: 'fiber', qty: 3 }] } });
  assert.deepEqual(r.textile.crafts[0].ingredients, [{ id: 'fiber', qty: 3 }]);
  assert.equal(r.textile.crafts[0].profession, 'Cloth');
  assert.equal(r.textile.crafts[0].gold, 100);
  assert.deepEqual(r.textile.crafts[0].stations, ['Atelier']);
});

test('può correggere anche gold e yield', () => {
  const r = applyOverrides(loadSample(), { textile: { gold: 50, yield: 2 } });
  assert.equal(r.textile.crafts[0].gold, 50);
  assert.equal(r.textile.crafts[0].yield, 2);
  assert.equal(r.textile.crafts[0].ingredients.length, 3);
});

test('la nota diventa craft.patch, mostrata nell interfaccia', () => {
  const r = applyOverrides(loadSample(), { textile: { note: 'Patch 2026-11-17', ingredients: [{ id: 'fiber', qty: 3 }] } });
  assert.equal(r.textile.crafts[0].patch, 'Patch 2026-11-17');
});

test('non modifica l oggetto originale', () => {
  const items = loadSample();
  const before = JSON.stringify(items);
  core.applyOverrides(items, { textile: { ingredients: [{ id: 'fiber', qty: 1 }] } });
  assert.equal(JSON.stringify(items), before);
});

test('id sconosciuti, materiali grezzi e correzioni vuote vengono ignorati senza errori', () => {
  const items = loadSample();
  const r = applyOverrides(items, { ghost: { ingredients: [] }, rag: { ingredients: [{ id: 'x', qty: 1 }] }, hood: null, robe: 'oops' });
  assert.deepEqual(r, items);
});

test('un ingrediente non valido nella correzione la scarta per intero', () => {
  const items = loadSample();
  const r = applyOverrides(items, { textile: { ingredients: [{ id: 'fiber', qty: -2 }] } });
  assert.deepEqual(r.textile, items.textile);
  const r2 = applyOverrides(items, { textile: { ingredients: 'no' } });
  assert.deepEqual(r2.textile, items.textile);
});

test('il calcolo usa la ricetta corretta (esempio: ingredienti ridotti)', () => {
  const items = applyOverrides(loadSample(), { textile: { ingredients: [{ id: 'fiber', qty: 3 }] } });
  const r = plain(core.computeNeeds(items, [{ id: 'hood', qty: 1 }]));
  assert.deepEqual(r.materials, { fiber: 6, rag: 20, mask: 8 });
});

// ---- loadData con overrides.json ----
function net(state) {
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(url);
    if (state.down) throw new TypeError('fetch failed');
    const name = url.split('/').pop();
    const body = { 'meta.json': state.meta, 'items.json': state.items, 'overrides.json': state.overrides }[name];
    if (!body) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => body };
  };
  return { fetchFn, calls };
}
const store = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const load = async (...a) => plain(await core.loadData(...a));

test('loadData applica overrides.json agli oggetti scaricati', async () => {
  const n = net({ meta, items: loadSample(), overrides: { textile: { ingredients: [{ id: 'fiber', qty: 3 }] } } });
  const r = await load('https://x/data/', { fetchFn: n.fetchFn, storage: store() });
  assert.deepEqual(r.items.textile.crafts[0].ingredients, [{ id: 'fiber', qty: 3 }]);
});

test('overrides.json assente (404) non è un errore', async () => {
  const n = net({ meta, items: loadSample() });
  const r = await load('https://x/data/', { fetchFn: n.fetchFn, storage: store() });
  assert.equal(r.items.textile.crafts[0].ingredients.length, 3);
  assert.equal(r.offline, false);
});

test('overrides.json viene riscaricato anche quando gli oggetti sono in cache', async () => {
  const state = { meta, items: loadSample(), overrides: {} };
  const n = net(state);
  const storage = store();
  await load('https://x/data/', { fetchFn: n.fetchFn, storage });
  state.overrides = { textile: { ingredients: [{ id: 'fiber', qty: 1 }] } };
  n.calls.length = 0;
  const r = await load('https://x/data/', { fetchFn: n.fetchFn, storage });
  assert.deepEqual(n.calls, ['https://x/data/meta.json', 'https://x/data/overrides.json']);
  assert.deepEqual(r.items.textile.crafts[0].ingredients, [{ id: 'fiber', qty: 1 }]);
});

test('offline: usa le correzioni salvate in cache', async () => {
  const state = { meta, items: loadSample(), overrides: { textile: { ingredients: [{ id: 'fiber', qty: 3 }] } } };
  const n = net(state);
  const storage = store();
  await load('https://x/data/', { fetchFn: n.fetchFn, storage });
  state.down = true;
  const r = await load('https://x/data/', { fetchFn: n.fetchFn, storage });
  assert.equal(r.offline, true);
  assert.deepEqual(r.items.textile.crafts[0].ingredients, [{ id: 'fiber', qty: 3 }]);
});
