const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore, loadSample, plain } = require('./load-core');

const core = loadCore();
const computeNeeds = (...args) => plain(core.computeNeeds(...args));
const items = loadSample();

test('hood x1 espande fino ai materiali grezzi', () => {
  const r = computeNeeds(items, [{ id: 'hood', qty: 1 }]);
  assert.deepEqual(r.materials, { fiber: 6, powder: 10, rag: 30, mask: 8 });
  assert.equal(r.gold, 3200);
  assert.equal(r.steps.find((s) => s.id === 'hood').times, 1);
  assert.equal(r.steps.find((s) => s.id === 'textile').times, 2);
});

test('hood + robe sommano il textile condiviso una volta sola', () => {
  const r = computeNeeds(items, [{ id: 'hood', qty: 1 }, { id: 'robe', qty: 1 }]);
  assert.deepEqual(r.materials, { fiber: 15, powder: 25, rag: 75, mask: 8 });
  assert.equal(r.gold, 7000);
});

test('expandIntermediates:false tiene il textile come materiale', () => {
  const r = computeNeeds(items, [{ id: 'hood', qty: 1 }], { expandIntermediates: false });
  assert.equal(r.materials.textile, 2);
  assert.equal(r.steps.some((s) => s.id === 'textile'), false);
});

test('un obiettivo grezzo compare come materiale senza step', () => {
  const r = computeNeeds(items, [{ id: 'rag', qty: 7 }]);
  assert.deepEqual(r.materials, { rag: 7 });
  assert.deepEqual(r.steps, []);
  assert.equal(r.gold, 0);
});

test('yield > 1 arrotonda per eccesso il numero di craft', () => {
  const r = computeNeeds(items, [{ id: 'bulk', qty: 6 }]);
  assert.equal(r.steps.find((s) => s.id === 'bulk').times, 2);
  assert.equal(r.materials.rag, 20);
});

test('un ciclo di ricette non lancia e produce un warning cycle:', () => {
  const r = computeNeeds(items, [{ id: 'loop-a', qty: 1 }]);
  assert.ok(r.warnings.some((w) => w.startsWith('cycle:')));
  assert.ok(Object.keys(r.materials).length > 0);
});

test('un id sconosciuto produce un warning unknown: senza eccezioni', () => {
  const r = computeNeeds(items, [{ id: 'ghost', qty: 1 }]);
  assert.ok(r.warnings.includes('unknown:ghost'));
});
