// Consiglio "craft o commercio": opzione obtained di computeNeeds, decideItems (costi unitari) e recommendPlan.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore, loadSample, plain } = require('./load-core');

const core = loadCore();
const computeNeeds = (...a) => plain(core.computeNeeds(...a));
const items = loadSample(); // hood = 2 textile + 20 rag + 8 mask (3000 gold); textile = 3 fiber + 5 powder + 5 rag (100 gold)
const hood = [{ id: 'hood', qty: 1 }];

// ---- Task 1: opzione obtained ----
test('obtained: l oggetto resta tra i materiali e non genera passi né gold', () => {
  const r = computeNeeds(items, hood, { obtained: ['textile'] });
  assert.deepEqual(r.materials, { textile: 2, rag: 20, mask: 8 });
  assert.deepEqual(r.steps.map((s) => s.id), ['hood']);
  assert.equal(r.gold, 3000);
});

test('obtained accetta anche un Set', () => {
  const r = computeNeeds(items, hood, { obtained: new Set(['textile']) });
  assert.deepEqual(r.materials, { textile: 2, rag: 20, mask: 8 });
});

const rec = (gold, ingredients) => ({ crafts: [{ profession: 'P', level: 1, stations: [], gold, ingredients }] });
const raw = () => ({ crafts: [] });

test('obtained non espande nemmeno gli ingredienti più in basso', () => {
  const chain = {
    a: rec(0, [{ id: 'b', qty: 1 }]),
    b: rec(0, [{ id: 'c', qty: 2 }]),
    c: rec(0, [{ id: 'y', qty: 1 }]),
    y: raw(),
  };
  const r = computeNeeds(chain, [{ id: 'a', qty: 1 }], { obtained: ['b'] });
  assert.deepEqual(r.materials, { b: 1 });
  assert.deepEqual(r.steps.map((s) => s.id), ['a']);
});

test('un obiettivo esplicito si espande anche se è in obtained', () => {
  const r = computeNeeds(items, [{ id: 'hood', qty: 1 }, { id: 'textile', qty: 1 }], { obtained: ['textile'] });
  assert.equal(r.steps.find((s) => s.id === 'textile').times, 3); // 2 per il cappuccio + 1 esplicito
  assert.equal(r.materials.textile, undefined);
});

test('have non si applica agli oggetti ottenuti', () => {
  const r = computeNeeds(items, hood, { have: { textile: 2 }, obtained: ['textile'] });
  assert.equal(r.materials.textile, 2);
});

test('senza obtained il risultato è identico a prima', () => {
  assert.deepEqual(computeNeeds(items, hood, { obtained: [] }), computeNeeds(items, hood));
});

// ---- Task 2: decideItems ----
const fs = require('node:fs');
const path = require('node:path');
const trade = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'trade.json'), 'utf8'));
const decideItems = (it, targets, deliveries, objective) => plain(core.decideItems(it, trade, targets, deliveries, objective));
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-3, `${msg || ''} ${a} vs ${b}`);
const nearPair = (p, q, msg) => { near(p[0], q[0], msg); near(p[1], q[1], msg); };
const W = [{ id: 'weapon', qty: 1 }];
const base = () => ({
  r1: raw(), r2: raw(),
  weapon: rec(0, [{ id: 'standard-ingot', qty: 1 }, { id: 'standard-lumber', qty: 1 }]),
  'standard-ingot': rec(5, [{ id: 'r1', qty: 3 }]),
  'standard-lumber': rec(10, [{ id: 'r2', qty: 2 }]),
});

test('obiettivi diversi danno decisioni diverse', () => {
  const farm = decideItems(base(), W, [], 'farm')['standard-ingot'];
  assert.equal(farm.choice, 'trade');
  nearPair(farm.unitCraft, [3, 5], 'craft farm');
  nearPair(farm.unitTrade, [2 / 1.22, 10 / 1.22 + 80 / (1.22 * 9)], 'trade farm');
  assert.deepEqual([farm.inputId, farm.why, farm.tier, farm.family, farm.post], ['standard-lumber', 'trade', 'standard', 'ingot', 'water-drift']);
  const gold = decideItems(base(), W, [], 'gold')['standard-ingot'];
  assert.equal(gold.choice, 'craft');
  nearPair(gold.unitCraft, [5, 3], 'craft gold');
  nearPair(gold.unitTrade, [10 / 1.22 + 80 / (1.22 * 9), 2 / 1.22], 'trade gold');
  assert.equal(gold.why, 'cost');
});

test('il materiale di partenza è di una famiglia diversa dalla destinazione', () => {
  const d = decideItems(base(), W, [], 'farm')['standard-lumber'];
  assert.equal(d.inputId, 'standard-ingot'); // mai 'standard-lumber' stesso
  assert.equal(d.choice, 'craft'); // [2, 10] contro circa [2.459, …]
});

test('rapporto null (superior): craft, nessun costo di commercio, motivo nodata', () => {
  const it = { ...base(), 'superior-ingot': rec(0, [{ id: 'r1', qty: 1 }]), weapon: rec(0, [{ id: 'superior-ingot', qty: 1 }]) };
  const d = decideItems(it, W, [], 'farm')['superior-ingot'];
  assert.deepEqual([d.unitTrade, d.choice, d.why, d.ratio], [null, 'craft', 'nodata', null]);
});

test('nessun materiale di partenza: craft con motivo noinput', () => {
  const it = { r1: raw(), weapon: rec(0, [{ id: 'fine-ingot', qty: 1 }]), 'fine-ingot': rec(0, [{ id: 'r1', qty: 1 }]) };
  const d = decideItems(it, W, [], 'farm')['fine-ingot'];
  assert.deepEqual([d.unitTrade, d.choice, d.why, d.inputId], [null, 'craft', 'noinput', null]);
});

test('un registro con consegne cambia il rapporto usato', () => {
  const log = [{ family: 'ingot', tier: 'standard', packs: 7, input: 63, received: 630, at: '' }];
  const d = decideItems(base(), W, log, 'farm')['standard-ingot'];
  assert.deepEqual([d.ratio, d.ratioSource, d.ratioN], [10, 'log', 1]);
});

test('solo gli id raggiungibili e commerciabili compaiono', () => {
  const it = { ...base(), 'standard-leather': rec(1, [{ id: 'r1', qty: 1 }]) };
  assert.deepEqual(Object.keys(decideItems(it, W, [], 'farm')).sort(), ['standard-ingot', 'standard-lumber']);
});

test('cicli di ricette e id sconosciuti non lanciano e non danno NaN', () => {
  const it = {
    weapon: rec(0, [{ id: 'standard-ingot', qty: 1 }]),
    'standard-ingot': rec(1, [{ id: 'standard-lumber', qty: 1 }]),
    'standard-lumber': rec(1, [{ id: 'standard-ingot', qty: 1 }]),
  };
  for (const objective of ['farm', 'gold']) {
    const r = decideItems(it, [{ id: 'weapon', qty: 1 }, { id: 'ghost', qty: 1 }], [], objective);
    assert.deepEqual(Object.keys(r).sort(), ['standard-ingot', 'standard-lumber']);
    for (const d of Object.values(r)) for (const n of [...d.unitCraft, ...(d.unitTrade || [])]) assert.ok(Number.isFinite(n), objective + ' ' + d.id);
  }
});
