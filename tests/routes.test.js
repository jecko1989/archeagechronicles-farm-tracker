const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore } = require('./load-core');
const C = loadCore();

// Mini dataset: il caso "Rainbow Fruit Jam Crate" (Shadowpath -> Stargazer) è il primo in classifica
// (payout 36.855, costo 1.100, netto 35.755, 3m46s, 9.484,5 gold/min).
const raw = {
  source: { build: 1, checked: '2026-11-09' }, speed: 7.4, perLoad: 7,
  posts: [{ id: 3000, name: 'Stargazer', region: 'Astron Plains' }, { id: 3100, name: 'Shadowpath Temple', region: 'Astron Plains' }],
  metres: { '3100-3000': 1673.815, '3000-3100': 1673.815 },
  goods: [
    { id: 1109, name: 'Rainbow Fruit Jam Crate', type: 'Gold specialty', origin: 'Shadowpath Temple', company: 'A', packingGold: 80, purchased: false, purchaseGold: null,
      inputs: [{ item: 'Rainbow Fruit Jam', qty: 3 }, { item: 'Blank Trade Certificate', qty: 1 }] },
    { id: 1101, name: 'Bluesalt Trade Goods', type: 'Company goods', origin: 'Shadowpath Temple', company: 'B', packingGold: 0, purchased: true, purchaseGold: null, inputs: [] },
    { id: 1119, name: 'Standard Lumber Trade Goods', type: 'Material pack', origin: 'Shadowpath Temple', company: 'C', packingGold: 80, purchased: false, purchaseGold: null,
      inputs: [{ item: 'Standard Lumber', qty: 9 }, { item: 'Blank Trade Certificate', qty: 1 }] },
  ],
  items: { 'Rainbow Fruit Jam': { fee: 300, yield: 1 }, 'Blank Trade Certificate': { price: 20 }, 'Standard Lumber': {}, 'Mystery Essence': { fee: 1000, yield: 2, inputs: [{ item: 'Rainbow Fruit Jam', qty: 1 }] } },
  routes: [
    { from: 'Shadowpath Temple', to: 'Stargazer', goodId: 1109, reward: 'Gold', units: 36855 },
    { from: 'Shadowpath Temple', to: 'Stargazer', goodId: 1101, reward: 'Gold', units: 20000 },
    { from: 'Shadowpath Temple', to: 'Stargazer', goodId: 1119, reward: 'Standard Textile', units: 9 },
    { from: 'Shadowpath Temple', to: 'Nowhere', goodId: 1109, reward: 'Gold', units: 5 },
    { from: 'Shadowpath Temple', to: 'Stargazer', goodId: 999, reward: 'Gold', units: 5 },
  ],
};

test('normalizeRoutes: scarta route con pacco o postazione sconosciuti e aggancia i metri', () => {
  const d = C.normalizeRoutes(raw);
  assert.equal(d.routes.length, 3);
  assert.equal(d.routes[0].good.name, 'Rainbow Fruit Jam Crate');
  assert.equal(d.routes[0].metres, 1673.815);
});

test('normalizeRoutes: struttura inutilizzabile -> null', () => {
  assert.equal(C.normalizeRoutes(null), null);
  assert.equal(C.normalizeRoutes({}), null);
  assert.equal(C.normalizeRoutes({ ...raw, speed: 0 }), null);
  assert.equal(C.normalizeRoutes({ ...raw, routes: 'x' }), null);
});

test('routeEconomics: un pacco, mercato 100%, carro a nolo', () => {
  const d = C.normalizeRoutes(raw);
  const e = C.routeEconomics(d, d.routes[0], { packs: 1, market: 100, rent: true });
  assert.equal(e.ranked, true);
  assert.equal(e.payout, 36855);
  assert.equal(e.cost, 1100); // 20 certificato + 900 crafting (3 x 300) + 80 imballaggio + 100 nolo
  assert.equal(e.net, 35755);
  assert.equal(Math.round(e.seconds), 226);
  assert.equal(Math.round(e.perMinute * 10) / 10, 9484.5);
});

test('routeEconomics: mercato e nolo cambiano payout e costo; oltre 7 pacchi servono più carichi con ritorno', () => {
  const d = C.normalizeRoutes(raw);
  const a = C.routeEconomics(d, d.routes[0], { packs: 1, market: 50, rent: false });
  assert.equal(a.payout, 18427.5);
  assert.equal(a.cost, 1000);
  const b = C.routeEconomics(d, d.routes[0], { packs: 8, market: 100, rent: true });
  assert.equal(b.payout, 8 * 36855);
  assert.equal(b.cost, 8 * 1000 + 2 * 100); // 2 carichi
  assert.equal(Math.round(b.seconds), Math.round(3 * (1673.815 / 7.4))); // andata, ritorno, andata
});

test('routeEconomics: pacco da comprare senza prezzo o premio in oggetti = non in classifica', () => {
  const d = C.normalizeRoutes(raw);
  assert.equal(C.routeEconomics(d, d.routes[1], { packs: 1, market: 100, rent: true }).ranked, false);
  const m = C.routeEconomics(d, d.routes[2], { packs: 1, market: 100, rent: true });
  assert.equal(m.ranked, false);
  assert.equal(Math.round(m.seconds), 226);
});

test('routeEconomics: il costo di crafting segue tutta la catena di ricette, diviso per la resa', () => {
  const d = C.normalizeRoutes({
    ...raw,
    goods: [...raw.goods, { id: 1162, name: 'Seasoning Box', type: 'Gold specialty', origin: 'Shadowpath Temple', company: 'B', packingGold: 1000, purchased: false, purchaseGold: null, inputs: [{ item: 'Mystery Essence', qty: 3 }] }],
    routes: [{ from: 'Shadowpath Temple', to: 'Stargazer', goodId: 1162, reward: 'Gold', units: 171816 }],
  });
  const e = C.routeEconomics(d, d.routes[0], { packs: 1, market: 100, rent: true });
  assert.equal(e.ranked, true);
  assert.equal(e.cost, 1000 + 3 * ((1000 + 300) / 2) + 100); // imballaggio + 3 essenze (commissione + 1 marmellata, resa 2) + nolo
});

test('rankRoutes: solo premi in gold con prezzo noto, per gold al minuto o per gold netto', () => {
  const d = C.normalizeRoutes(raw);
  const r = C.rankRoutes(d, { packs: 1, market: 100, rent: true, by: 'perMinute' });
  assert.equal(r.total, 2);
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].route.good.id, 1109);
  assert.equal(C.rankRoutes(d, { packs: 1, market: 100, rent: true, by: 'net' }).rows.length, 1);
});

test('driveSeconds: metri / velocità; nessuna strada = null', () => {
  const d = C.normalizeRoutes(raw);
  assert.equal(Math.round(C.driveSeconds(d, 'Shadowpath Temple', 'Stargazer')), 226);
  assert.equal(C.driveSeconds(d, 'Stargazer', 'Stargazer'), null);
});

test('loadRoutes: si riscarica, tiene in cache il file letto e senza rete lo usa; 404 = nessun dato', async () => {
  const m = new Map();
  const storage = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
  const ok = async () => ({ ok: true, status: 200, json: async () => raw });
  const online = await C.loadRoutes('data/', { fetchFn: ok, storage });
  assert.equal(online.routes.length, 3);
  const offline = await C.loadRoutes('data/', { fetchFn: async () => { throw new Error('rete'); }, storage });
  assert.equal(offline.routes.length, 3);
  assert.equal(await C.loadRoutes('data/', { fetchFn: async () => ({ ok: false, status: 404 }), storage }), null);
});
