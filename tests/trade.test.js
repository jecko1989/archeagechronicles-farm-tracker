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
