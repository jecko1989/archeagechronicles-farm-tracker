// Oggetti lavorati già posseduti (opts.have): riducono i craft e quindi i materiali grezzi da farmare.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore, loadSample, plain } = require('./load-core');

const core = loadCore();
const computeNeeds = (...args) => plain(core.computeNeeds(...args));
const items = loadSample(); // hood = 2 textile + 20 rag + 8 mask (3000 gold); textile = 3 fiber + 5 powder + 5 rag (100 gold)
const hood = [{ id: 'hood', qty: 1 }];
const step = (r, id) => r.steps.find((s) => s.id === id);

test('senza have ogni passo riporta need e covered = 0', () => {
  const r = computeNeeds(items, hood);
  assert.deepEqual([step(r, 'textile').need, step(r, 'textile').covered], [2, 0]);
  assert.deepEqual([step(r, 'hood').need, step(r, 'hood').covered], [1, 0]);
});

test('intermedio posseduto per intero: niente craft, niente grezzi, niente gold per quel passo', () => {
  const r = computeNeeds(items, hood, { have: { textile: 2 } });
  assert.deepEqual(r.materials, { rag: 20, mask: 8 });
  assert.equal(r.gold, 3000);
  assert.deepEqual([step(r, 'textile').times, step(r, 'textile').need, step(r, 'textile').covered], [0, 2, 2]);
});

test('intermedio posseduto in parte: si craftano solo i mancanti', () => {
  const r = computeNeeds(items, hood, { have: { textile: 1 } });
  assert.deepEqual(r.materials, { fiber: 3, powder: 5, rag: 25, mask: 8 });
  assert.equal(r.gold, 3100);
  assert.equal(step(r, 'textile').times, 1);
});

test('più di quanto serve: la parte in eccesso non conta (covered = need, nessun valore negativo)', () => {
  const r = computeNeeds(items, hood, { have: { textile: 9 } });
  assert.deepEqual(r.materials, { rag: 20, mask: 8 });
  assert.equal(step(r, 'textile').covered, 2);
  assert.equal(step(r, 'textile').times, 0);
});

test('con yield > 1 i posseduti riducono gli oggetti, poi si arrotonda per eccesso i craft', () => {
  const bulk = [{ id: 'bulk', qty: 6 }]; // yield 5: da zero servono 2 craft = 20 rag
  assert.equal(step(computeNeeds(items, bulk), 'bulk').times, 2);
  const r = computeNeeds(items, bulk, { have: { bulk: 1 } }); // ne mancano 5 -> 1 craft
  assert.equal(step(r, 'bulk').times, 1);
  assert.equal(r.materials.rag, 10);
  assert.equal(computeNeeds(items, bulk, { have: { bulk: 6 } }).materials.rag, undefined);
});

const rec = (ingredients) => ({ crafts: [{ profession: 'P', level: 1, stations: ['S'], gold: 10, ingredients }] });
const chain = { a: rec([{ id: 'b', qty: 1 }]), b: rec([{ id: 'c', qty: 2 }]), c: rec([{ id: 'y', qty: 1 }]), y: { crafts: [] } };

test('se possiedi il genitore, i suoi ingredienti restano nell elenco ma con 0 craft e nessun grezzo', () => {
  const r = computeNeeds(chain, [{ id: 'a', qty: 1 }], { have: { b: 1 } });
  assert.deepEqual(r.steps.map((s) => s.id), ['c', 'b', 'a']);
  assert.deepEqual(r.steps.map((s) => s.times), [0, 0, 1]);
  assert.equal(step(r, 'c').need, 0);
  assert.deepEqual(r.materials, {});
  assert.equal(r.gold, 10); // solo il craft di a
});

test('catena senza possessi: invariata, i grezzi si sommano come prima', () => {
  const r = computeNeeds(chain, [{ id: 'a', qty: 1 }], { have: {} });
  assert.deepEqual(r.materials, { y: 2 });
  assert.deepEqual(r.steps.map((s) => s.times), [2, 1, 1]);
});

test('anche l obiettivo stesso può essere già posseduto', () => {
  const r = computeNeeds(items, hood, { have: { hood: 1 } });
  assert.deepEqual(r.materials, {});
  assert.equal(r.gold, 0);
  assert.equal(step(r, 'hood').times, 0);
});

test('con intermedi da farmare, have degli intermedi non cambia il calcolo (lo scala la tabella dei materiali)', () => {
  const r = computeNeeds(items, hood, { expandIntermediates: false, have: { textile: 2 } });
  assert.equal(r.materials.textile, 2);
});

test('l oggetto have passato non viene modificato', () => {
  const have = { textile: 1 };
  core.computeNeeds(items, hood, { have });
  assert.deepEqual(plain(have), { textile: 1 });
});
