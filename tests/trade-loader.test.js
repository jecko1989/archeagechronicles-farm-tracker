// loadTrade: scarica data/trade.json a ogni apertura, lo normalizza e lo tiene in cache per l'uso offline.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadCore, plain } = require('./load-core');

const core = loadCore();
const loadTrade = async (...a) => plain(await core.loadTrade(...a));
const fixture = () => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'trade.json'), 'utf8'));
const KEY = 'aa-farm-trade-v1';

// fetch finto: state.trade = corpo (undefined = 404), state.down = rete assente, state.badJson = risposta 200 non leggibile
function fakeNet(state) {
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(url);
    if (state.down) throw new TypeError('fetch failed');
    if (state.status && state.status !== 200) return { ok: false, status: state.status, json: async () => ({}) };
    if (state.badJson) return { ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token'); } };
    if (state.trade === undefined) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => state.trade };
  };
  return { fetchFn, calls };
}
function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
}

test('scarica trade.json, lo normalizza e lo mette in cache', async () => {
  const net = fakeNet({ trade: fixture() });
  const storage = fakeStorage();
  const r = await loadTrade('https://x/data/', { fetchFn: net.fetchFn, storage });
  assert.deepEqual(r, fixture());
  assert.deepEqual(net.calls, ['https://x/data/trade.json']);
  assert.ok(storage.map.has(KEY));
});

test('il file si riscarica a ogni apertura (può cambiare in qualsiasi momento)', async () => {
  const storage = fakeStorage();
  const t2 = fixture();
  t2.packs.standard.gold = 90;
  await loadTrade('https://x/data/', { fetchFn: fakeNet({ trade: fixture() }).fetchFn, storage });
  const r = await loadTrade('https://x/data/', { fetchFn: fakeNet({ trade: t2 }).fetchFn, storage });
  assert.equal(r.packs.standard.gold, 90);
});

test('404 → null, anche con una versione in cache (il file è stato tolto)', async () => {
  const storage = fakeStorage();
  await loadTrade('https://x/data/', { fetchFn: fakeNet({ trade: fixture() }).fetchFn, storage });
  assert.equal(await loadTrade('https://x/data/', { fetchFn: fakeNet({}).fetchFn, storage }), null);
});

test('rete assente o errore del server → usa la cache; senza cache → null', async () => {
  const storage = fakeStorage();
  await loadTrade('https://x/data/', { fetchFn: fakeNet({ trade: fixture() }).fetchFn, storage });
  assert.deepEqual(await loadTrade('https://x/data/', { fetchFn: fakeNet({ down: true }).fetchFn, storage }), fixture());
  assert.deepEqual(await loadTrade('https://x/data/', { fetchFn: fakeNet({ status: 500 }).fetchFn, storage }), fixture());
  assert.equal(await loadTrade('https://x/data/', { fetchFn: fakeNet({ down: true }).fetchFn, storage: fakeStorage() }), null);
});

test('file malformato o con struttura sbagliata → null (anche con cache), senza lanciare', async () => {
  const storage = fakeStorage();
  await loadTrade('https://x/data/', { fetchFn: fakeNet({ trade: fixture() }).fetchFn, storage });
  for (const state of [{ trade: {} }, { trade: 'x' }, { trade: null }, { badJson: true }]) {
    assert.equal(await loadTrade('https://x/data/', { fetchFn: fakeNet(state).fetchFn, storage }), null, JSON.stringify(state));
  }
});

test('un indirizzo senza barra finale funziona e uno storage che lancia non rompe', async () => {
  const net = fakeNet({ trade: fixture() });
  const broken = { getItem() { throw new Error('no storage'); }, setItem() { throw new Error('no storage'); } };
  const r = await loadTrade('https://x/data', { fetchFn: net.fetchFn, storage: broken });
  assert.deepEqual(r, fixture());
  assert.deepEqual(net.calls, ['https://x/data/trade.json']);
});
