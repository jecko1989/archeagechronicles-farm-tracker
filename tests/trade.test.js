// Tab Trade: modello dati (normalizeTrade, tradeInfo), registro consegne (effectiveRatio) e piano (tradePlan).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadCore, plain } = require('./load-core');

const core = loadCore();
const fixture = () => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'trade.json'), 'utf8'));
const normalizeTrade = (raw) => plain(core.normalizeTrade(raw));
const tradeInfo = (trade, id) => plain(core.tradeInfo(trade, id));

// ---- Task 1: modello dati ----
test('la fixture è valida e normalizeTrade la restituisce uguale', () => {
  assert.deepEqual(normalizeTrade(fixture()), fixture());
});

test('senza posts, packs o limits restituisce null', () => {
  assert.equal(normalizeTrade(null), null);
  assert.equal(normalizeTrade({}), null);
  assert.equal(normalizeTrade({ ...fixture(), packs: undefined }), null);
  assert.equal(normalizeTrade({ ...fixture(), posts: undefined }), null);
  assert.equal(normalizeTrade({ ...fixture(), limits: undefined }), null);
});

test('un pack con input non intero positivo rende il file non valido', () => {
  for (const bad of [0, 2.5]) {
    const t = fixture();
    t.packs.fine.input = bad;
    assert.equal(normalizeTrade(t), null, 'input ' + bad);
  }
});

test('un rapporto non numerico o <= 0 diventa null, il resto resta valido', () => {
  for (const bad of ['1.2', -1]) {
    const t = fixture();
    t.ratios.default.fine = bad;
    const r = normalizeTrade(t);
    assert.notEqual(r, null);
    assert.equal(r.ratios.default.fine, null);
    assert.equal(r.ratios.default.standard, 1.22);
  }
});

test('tradeInfo riconosce livello, famiglia e avamposto', () => {
  const t = fixture();
  assert.deepEqual(tradeInfo(t, 'fine-lumber'), { tier: 'fine', family: 'lumber', post: 'seaglass-harbor' });
  assert.deepEqual(tradeInfo(t, 'superior-stone'), { tier: 'superior', family: 'stone', post: 'shadow-path' });
  assert.equal(tradeInfo(t, 'standard-archeum').post, 'shadow-path');
});

test('tradeInfo restituisce null per ciò che non si commercia', () => {
  const t = fixture();
  for (const id of ['standard-bonecraft', 'blank-trade-certificate', 'hood', '']) assert.equal(tradeInfo(t, id), null, id);
});

// ---- Task 2: registro consegne e rapporti ----
const parseProgress = (t) => plain(core.parseProgress(t));
const reconcile = (p, items) => plain(core.reconcile(p, items));
const effectiveRatio = (...a) => plain(core.effectiveRatio(...a));
const base = { v: 1, targets: [], have: {}, expandIntermediates: true };
const delivery = (o) => ({ family: 'additive', tier: 'fine', packs: 7, input: 21, received: 23, at: '2026-11-19', ...o });

test('parseProgress: un file vecchio senza deliveries resta valido e ottiene []', () => {
  assert.deepEqual(parseProgress(JSON.stringify(base)).deliveries, []);
});

test('parseProgress scarta le consegne non valide', () => {
  const good = delivery({});
  const bad = [
    { family: 'x', tier: 'fine', packs: -1, input: 21, received: 1 },
    { family: 'x', tier: 'fine', packs: 1, input: 0, received: 1 },
    { family: 'x', tier: 'fine', packs: 1.5, input: 3, received: 1 },
    { tier: 'fine', packs: 1, input: 3, received: 1 },
    { family: 5, tier: 'fine', packs: 1, input: 3, received: 1 },
    null,
  ];
  const p = parseProgress(JSON.stringify({ ...base, deliveries: [good, ...bad] }));
  assert.deepEqual(p.deliveries, [good]);
});

test('deliveries che non è un array viene ignorato (non invalida il file)', () => {
  const p = parseProgress(JSON.stringify({ ...base, deliveries: 'x' }));
  assert.notEqual(p, null);
  assert.deepEqual(p.deliveries, []);
});

test('reconcile conserva le consegne', () => {
  const d = delivery({});
  const r = reconcile({ ...base, deliveries: [d] }, {});
  assert.deepEqual(r.progress.deliveries, [d]);
});

test('effectiveRatio senza consegne usa la stima', () => {
  const t = fixture();
  assert.deepEqual(effectiveRatio(t, [], 'additive', 'fine'), { ratio: 1.1, source: 'estimate', n: 0 });
  assert.equal(effectiveRatio(t, [], 'stone', 'standard').ratio, 0.9); // byFamily
  assert.equal(effectiveRatio(t, [], 'stone', 'fine').ratio, 1.1); // ricade su default
  assert.deepEqual(effectiveRatio(t, [], 'additive', 'superior'), { ratio: null, source: 'estimate', n: 0 });
});

test('una consegna reale sostituisce la stima', () => {
  const r = effectiveRatio(fixture(), [delivery({})], 'additive', 'fine');
  assert.ok(Math.abs(r.ratio - 23 / 21) < 1e-9);
  assert.equal(r.source, 'log');
  assert.equal(r.n, 1);
});

test('usa solo le ultime 5 consegne della stessa famiglia e livello', () => {
  const log = [1, 2, 3, 4, 5, 6, 7].map((i) => delivery({ input: 10, received: i }));
  log.push(delivery({ family: 'lumber', input: 10, received: 99 }));
  const r = effectiveRatio(fixture(), log, 'additive', 'fine');
  assert.ok(Math.abs(r.ratio - (3 + 4 + 5 + 6 + 7) / 50) < 1e-9);
  assert.equal(r.n, 5);
});

test('consegne con input 0 e altre famiglie/livelli sono ignorate', () => {
  const log = [delivery({ input: 0, received: 5 }), delivery({ family: 'lumber' }), delivery({ tier: 'standard' })];
  assert.deepEqual(effectiveRatio(fixture(), log, 'additive', 'fine'), { ratio: 1.1, source: 'estimate', n: 0 });
});

// ---- Task 3: piano di commercio ----
const tradePlan = (...a) => plain(core.tradePlan(...a));
const step = (id, need, covered = 0) => ({ id, need, covered, times: need - covered });
const plan = (steps, deliveries = [], tripsPerDay = 3) => tradePlan(fixture(), steps, deliveries, { tripsPerDay });

test('Standard Ingot ×810 → Water Drift: 74 casse, 666 materiali, 5.920 gold, 11 viaggi', () => {
  const r = plan([step('standard-ingot', 810)]);
  assert.equal(r.groups.length, 1);
  assert.equal(r.groups[0].post, 'water-drift');
  const l = r.groups[0].lines[0];
  assert.deepEqual([l.units, l.packs, l.input, l.gold, l.source], [810, 74, 666, 5920, 'estimate']);
  assert.deepEqual([l.trips, l.days], [11, 4]); // ceil(74/7), ceil(11/3)
  assert.equal(plan([step('standard-ingot', 810)], [], 6).groups[0].lines[0].days, 2);
});

test('le righe sono alternative: viaggi e giorni per riga, nessuna somma tra righe', () => {
  // Standard Ingot serve proprio a fare il Fine Ingot: sommare le due righe conterebbe lo stesso materiale due volte
  const r = plan([step('standard-ingot', 810), step('fine-ingot', 45)]);
  assert.equal(r.groups.length, 1);
  const [std, fine] = r.groups[0].lines;
  assert.deepEqual([std.packs, std.trips, std.days], [74, 11, 4]);
  assert.deepEqual([fine.packs, fine.gold, fine.trips, fine.days], [14, 2800, 2, 1]);
  assert.equal('totals' in r, false);
  assert.equal('packs' in r.groups[0] || 'trips' in r.groups[0], false);
});

test('archeum e stone di Shadow Path stanno nello stesso gruppo, con rapporti diversi', () => {
  const r = plan([step('standard-archeum', 100), step('standard-stone', 100)]);
  assert.equal(r.groups.length, 1);
  assert.equal(r.groups[0].post, 'shadow-path');
  assert.deepEqual(r.groups[0].lines.map((l) => l.packs), [10, 13]);
  assert.deepEqual(r.groups[0].lines.map((l) => l.trips), [2, 2]);
  assert.equal(r.groups[0].lines[1].ratio, 0.9);
});

test('rapporto null: riga missing, nessun NaN, nessuna cifra inventata', () => {
  const r = plan([step('superior-additive', 5)]);
  const l = r.groups[0].lines[0];
  assert.deepEqual([l.missing, l.packs, l.input, l.gold, l.trips, l.days], [true, null, null, null, null, null]);
});

test('rapporto 0 (consegna con 0 ricevuti) è dato mancante, non infinite casse', () => {
  const r = plan([step('fine-ingot', 10)], [delivery({ family: 'ingot', input: 21, received: 0 })]);
  const l = r.groups[0].lines[0];
  assert.deepEqual([l.missing, l.packs, l.trips, l.days], [true, null, null, null]);
});

test('unità esatte non aggiungono una cassa per colpa dei decimali', () => {
  // standard stone: 9 materiali × 0.9 = 8,1 per cassa → 81 unità = esattamente 10 casse
  assert.equal(plan([step('standard-stone', 81)]).groups[0].lines[0].packs, 10);
});

test('unità già coperte da have: nessuna riga', () => {
  const r = plan([step('standard-ingot', 100, 100)]);
  assert.deepEqual(r.groups, []);
});

test('le ossa vanno in notTradeable, l oggetto finale è ignorato', () => {
  const r = plan([step('standard-bonecraft', 729), step('gyldenlords-cleaver', 1)]);
  assert.deepEqual(r.notTradeable, [{ id: 'standard-bonecraft', units: 729 }]);
  assert.deepEqual(r.groups, []);
});

test('usa il rapporto del registro quando c è', () => {
  const r = plan([step('fine-ingot', 45)], [delivery({ family: 'ingot', input: 21, received: 42 })]);
  const l = r.groups[0].lines[0];
  assert.deepEqual([l.ratio, l.source, l.n, l.packs], [2, 'log', 1, 8]); // ceil(45 / (2 × 3))
});

test('gli avamposti seguono l ordine di trade.posts', () => {
  const r = plan([step('standard-ingot', 10), step('standard-additive', 10)]); // ingot (Water Drift) prima nei passi
  assert.deepEqual(r.groups.map((g) => g.post), ['watchers', 'water-drift']);
});
