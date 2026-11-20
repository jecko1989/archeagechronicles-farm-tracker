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
