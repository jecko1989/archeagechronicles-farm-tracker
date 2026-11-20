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

// ---- Task 3: recommendPlan ----
const recommendPlan = (it, targets, have, deliveries, objective) =>
  plain(core.recommendPlan(it, trade, targets, have, deliveries, { objective, tripsPerDay: 3 }));
const byId = (r, id) => r.decisions.find((d) => d.id === id);
// weapon <- fine-ingot x1 <- 18 standard-ingot <- 3 r1 ciascuno; il Fine Lumber (3 r? da r2) può riempire le casse del Fine
const nested = () => ({
  r1: raw(), r2: raw(),
  weapon: rec(0, [{ id: 'fine-ingot', qty: 1 }]),
  'fine-ingot': rec(10, [{ id: 'standard-ingot', qty: 18 }]),
  'standard-ingot': rec(5, [{ id: 'r1', qty: 3 }]),
  'fine-lumber': rec(0, [{ id: 'r2', qty: 1 }]),
});
// due materiali che si servirebbero a vicenda come materiale di partenza
const mutual = () => ({
  r1: raw(),
  weapon: rec(0, [{ id: 'standard-ingot', qty: 100 }, { id: 'standard-lumber', qty: 100 }]),
  'standard-ingot': rec(5, [{ id: 'r1', qty: 10 }]),
  'standard-lumber': rec(5, [{ id: 'r1', qty: 10 }]),
});

test('annidamento: il commercio del Fine toglie lo Standard che serviva solo a lui', () => {
  const r = recommendPlan(nested(), W, {}, [], 'farm');
  const fine = byId(r, 'fine-ingot');
  assert.deepEqual([fine.choice, fine.crates, fine.needed], ['trade', 1, true]);
  assert.equal(byId(r, 'standard-ingot').needed, false);
  assert.deepEqual(r.plan.rawMaterials, { r2: 3 }); // nessun r1
  assert.deepEqual(r.plan.crateInputs, [{ id: 'fine-lumber', qty: 3 }]);
  assert.deepEqual([r.plan.farm, r.plan.gold], [3, 200]);
  assert.deepEqual(r.baseline, { farm: 54, gold: 100 });
  assert.equal(r.fallback, false);
});

test('guardia: con quantità piccole il consiglio non è peggiore del solo craft', () => {
  const r = recommendPlan(nested(), W, {}, [], 'gold'); // una sola cassa costa 200 gold, il craft 100
  assert.equal(r.fallback, true);
  assert.deepEqual([r.plan.farm, r.plan.gold, r.plan.crates], [54, 100, 0]);
  assert.ok(r.decisions.every((d) => d.choice === 'craft'));
  assert.equal(byId(r, 'fine-ingot').why, 'fallback');
});

test('conflitto: un materiale scelto per il commercio non è anche il materiale di partenza di un altro', () => {
  const r = recommendPlan(mutual(), W, {}, [], 'farm');
  const picks = ['standard-ingot', 'standard-lumber'].map((id) => byId(r, id));
  assert.deepEqual(picks.map((d) => d.choice).sort(), ['craft', 'trade']); // esattamente uno torna a craft
  assert.equal(picks.find((d) => d.choice === 'trade').crates, 10);
  for (const input of r.plan.crateInputs) {
    const d = byId(r, input.id);
    assert.ok(!(d.choice === 'trade' && d.crates > 0), input.id + ' è sia ottenuto col commercio sia materiale di partenza');
  }
  assert.deepEqual([r.plan.farm, r.plan.gold], [1900, 1750]); // 950 di craft + 800 di casse
  assert.deepEqual(r.baseline, { farm: 2000, gold: 1000 });
});

test('obiettivo gold sugli stessi dati del conflitto: mai peggiore del solo craft sul gold', () => {
  const r = recommendPlan(mutual(), W, {}, [], 'gold');
  assert.ok(r.plan.gold <= r.baseline.gold + 1e-9);
});

test('i materiali di partenza che richiedono oggetti ottenuti col commercio sono contati nelle casse', () => {
  // le casse del Fine si riempiono con 3 fine-lumber, ognuno dei quali richiede 18 standard-lumber: questi non possono
  // sparire dal conto se anche lo standard-lumber è scelto per il commercio (ricalcolo finché le quantità non si stabilizzano)
  const it = {
    r1: raw(), r2: raw(),
    weapon: rec(0, [{ id: 'fine-ingot', qty: 100 }, { id: 'standard-lumber', qty: 5 }]),
    'fine-ingot': rec(10, [{ id: 'r1', qty: 50 }]),
    'fine-lumber': rec(0, [{ id: 'standard-lumber', qty: 18 }]),
    'standard-lumber': rec(0, [{ id: 'r2', qty: 1 }]),
    'standard-ingot': rec(0, [{ id: 'r1', qty: 1 }]),
  };
  const r = recommendPlan(it, W, {}, [], 'farm');
  const fine = byId(r, 'fine-ingot'), lumber = byId(r, 'standard-lumber');
  assert.deepEqual([fine.choice, fine.units, fine.crates], ['trade', 100, 31]); // ceil(100 / (1.1 × 3))
  // 5 per l'arma + 93 fine-lumber × 18 standard-lumber ciascuno: senza il ricalcolo ripetuto sarebbero solo 5
  assert.deepEqual([lumber.choice, lumber.units, lumber.crates], ['trade', 5 + 93 * 18, 153]);
  assert.deepEqual(r.plan.crateInputs, [{ id: 'fine-lumber', qty: 93 }, { id: 'standard-ingot', qty: 153 * 9 }]);
  assert.deepEqual([r.plan.farm, r.plan.gold, r.plan.crates], [1377, 31 * 200 + 153 * 80, 184]);
  assert.deepEqual(r.plan.rawMaterials, { r1: 1377 });
  assert.deepEqual(r.baseline, { farm: 5005, gold: 1000 });
});

test('oggetti già posseduti: niente casse e niente ingressi', () => {
  const r = recommendPlan(nested(), W, { 'fine-ingot': 1 }, [], 'farm');
  assert.deepEqual([r.plan.crates, r.plan.crateInputs, r.plan.farm], [0, [], 0]);
});

test('nessun obiettivo: raccomandazione vuota senza errori', () => {
  const r = recommendPlan(nested(), [], {}, [], 'farm');
  assert.deepEqual([r.decisions, r.plan.farm, r.plan.gold, r.fallback], [[], 0, 0, false]);
});

test('obiettivo sconosciuto o ricette cicliche non lanciano', () => {
  const cyc = {
    weapon: rec(0, [{ id: 'standard-ingot', qty: 1 }]),
    'standard-ingot': rec(1, [{ id: 'standard-lumber', qty: 1 }]),
    'standard-lumber': rec(1, [{ id: 'standard-ingot', qty: 1 }]),
  };
  for (const objective of ['farm', 'gold']) {
    const r = recommendPlan(cyc, [{ id: 'weapon', qty: 1 }, { id: 'ghost', qty: 1 }], {}, [], objective);
    for (const n of [r.plan.farm, r.plan.gold, r.plan.crates, r.plan.days]) assert.ok(Number.isFinite(n), objective);
  }
});

test('il consiglio non è mai peggiore del solo craft sull obiettivo scelto', () => {
  for (const make of [nested, mutual]) {
    const farm = recommendPlan(make(), W, {}, [], 'farm');
    assert.ok(farm.plan.farm <= farm.baseline.farm + 1e-9, 'farm ' + make.name);
    const gold = recommendPlan(make(), W, {}, [], 'gold');
    assert.ok(gold.plan.gold <= gold.baseline.gold + 1e-9, 'gold ' + make.name);
  }
});
