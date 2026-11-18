const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore, loadSample, plain } = require('./load-core');

const core = loadCore();
const loadData = async (...args) => plain(await core.loadData(...args));

const meta = (updatedAt) => ({ updatedAt, count: 10, schema: 1 });

// fetch finto: serve meta.json/items.json da un oggetto, conta le chiamate; down=true simula la rete assente
function fakeNet(state) {
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(url);
    if (state.down) throw new TypeError('fetch failed');
    const name = url.split('/').pop();
    const body = name === 'meta.json' ? state.meta : name === 'items.json' ? state.items : null;
    if (!body) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => body };
  };
  return { fetchFn, calls };
}

function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
}

test('prima chiamata scarica meta e items e salva la cache', async () => {
  const net = fakeNet({ meta: meta('t1'), items: loadSample() });
  const storage = fakeStorage();
  const r = await loadData('https://x/data/', { fetchFn: net.fetchFn, storage });
  assert.equal(r.offline, false);
  assert.equal(r.meta.updatedAt, 't1');
  assert.ok(r.items.hood);
  assert.deepEqual(net.calls, ['https://x/data/meta.json', 'https://x/data/items.json', 'https://x/data/overrides.json']);
  assert.ok(storage.map.has('aa-farm-data-v1'));
});

test('con lo stesso updatedAt non riscarica items.json (solo meta e overrides)', async () => {
  const net = fakeNet({ meta: meta('t1'), items: loadSample() });
  const storage = fakeStorage();
  await loadData('https://x/data/', { fetchFn: net.fetchFn, storage });
  net.calls.length = 0;
  const r = await loadData('https://x/data/', { fetchFn: net.fetchFn, storage });
  assert.deepEqual(net.calls, ['https://x/data/meta.json', 'https://x/data/overrides.json']);
  assert.ok(r.items.hood);
  assert.equal(r.offline, false);
});

test('con un updatedAt nuovo riscarica items.json', async () => {
  const state = { meta: meta('t1'), items: loadSample() };
  const net = fakeNet(state);
  const storage = fakeStorage();
  await loadData('https://x/data/', { fetchFn: net.fetchFn, storage });
  state.meta = meta('t2');
  net.calls.length = 0;
  const r = await loadData('https://x/data/', { fetchFn: net.fetchFn, storage });
  assert.deepEqual(net.calls, ['https://x/data/meta.json', 'https://x/data/items.json', 'https://x/data/overrides.json']);
  assert.equal(r.meta.updatedAt, 't2');
});

test('rete assente con cache: offline true e stessi items', async () => {
  const state = { meta: meta('t1'), items: loadSample() };
  const net = fakeNet(state);
  const storage = fakeStorage();
  await loadData('https://x/data/', { fetchFn: net.fetchFn, storage });
  state.down = true;
  const r = await loadData('https://x/data/', { fetchFn: net.fetchFn, storage });
  assert.equal(r.offline, true);
  assert.equal(r.meta.updatedAt, 't1');
  assert.ok(r.items.hood);
});

test('rete assente senza cache: errore NO_DATA con l URL provato', async () => {
  const net = fakeNet({ down: true });
  await assert.rejects(
    core.loadData('https://x/data/', { fetchFn: net.fetchFn, storage: fakeStorage() }),
    /NO_DATA:.*https:\/\/x\/data\//,
  );
});

test('baseUrl senza slash finale viene normalizzato', async () => {
  const net = fakeNet({ meta: meta('t1'), items: loadSample() });
  await loadData('https://x/data', { fetchFn: net.fetchFn, storage: fakeStorage() });
  assert.equal(net.calls[0], 'https://x/data/meta.json');
});

test('uno storage che lancia eccezioni non rompe il caricamento', async () => {
  const net = fakeNet({ meta: meta('t1'), items: loadSample() });
  const storage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const r = await loadData('https://x/data/', { fetchFn: net.fetchFn, storage });
  assert.ok(r.items.hood);
});
