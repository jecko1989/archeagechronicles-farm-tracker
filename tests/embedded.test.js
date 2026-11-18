const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore, loadSample, plain } = require('./load-core');

const core = loadCore();
const meta = { updatedAt: 't1', count: 10, schema: 1 };

test('embeddedFetch serve meta, items e overrides come se arrivassero dalla rete', async () => {
  const f = core.embeddedFetch({ meta, items: loadSample(), overrides: { x: 1 } });
  for (const [name, expected] of [['meta.json', meta], ['overrides.json', { x: 1 }]]) {
    const r = await f('embedded/' + name);
    assert.equal(r.ok, true);
    assert.deepEqual(plain(await r.json()), expected);
  }
  const items = plain(await (await f('embedded/items.json')).json());
  assert.ok(items.hood);
});

test('un file sconosciuto risponde 404', async () => {
  const r = await core.embeddedFetch({ meta, items: {}, overrides: {} })('embedded/altro.json');
  assert.equal(r.ok, false);
  assert.equal(r.status, 404);
});

test('loadData con embeddedFetch e senza storage: dati e correzioni applicati, niente rete', async () => {
  const items = loadSample();
  const fetchFn = core.embeddedFetch({ meta, items, overrides: { textile: { ingredients: [{ id: 'fiber', qty: 3 }] } } });
  const noStorage = { getItem: () => null, setItem() {} };
  const r = plain(await core.loadData('embedded/', { fetchFn, storage: noStorage }));
  assert.equal(r.offline, false);
  assert.equal(r.meta.updatedAt, 't1');
  assert.deepEqual(r.items.textile.crafts[0].ingredients, [{ id: 'fiber', qty: 3 }]);
});

test('overrides mancante nei dati incorporati: 404 gestito come nessuna correzione', async () => {
  const fetchFn = core.embeddedFetch({ meta, items: loadSample() });
  const r = plain(await core.loadData('embedded/', { fetchFn, storage: { getItem: () => null, setItem() {} } }));
  assert.equal(r.items.textile.crafts[0].ingredients.length, 3);
});
