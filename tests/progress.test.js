const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore, loadSample, plain } = require('./load-core');

const core = loadCore();
const emptyProgress = () => plain(core.emptyProgress());
const serializeProgress = (p) => core.serializeProgress(p);
const parseProgress = (t) => plain(core.parseProgress(t));
const reconcile = (p, items) => plain(core.reconcile(p, items));

test('round trip serialize/parse restituisce lo stesso progresso', () => {
  const p = { v: 1, targets: [{ id: 'hood', qty: 2 }], have: { rag: 5 }, expandIntermediates: false, deliveries: [] };
  assert.deepEqual(parseProgress(serializeProgress(p)), p);
});

test('emptyProgress è valido per parseProgress', () => {
  const p = emptyProgress();
  assert.deepEqual(p, { v: 1, targets: [], have: {}, expandIntermediates: true, deliveries: [] });
  assert.deepEqual(parseProgress(serializeProgress(p)), p);
});

test('JSON non valido restituisce null', () => {
  assert.equal(parseProgress('{bad'), null);
});

test('versione diversa da 1 restituisce null', () => {
  assert.equal(parseProgress('{"v":2}'), null);
});

test('quantità negative o non intere vengono scartate', () => {
  const text = JSON.stringify({
    v: 1,
    targets: [{ id: 'hood', qty: -3 }, { id: 'robe', qty: 1.5 }, { id: 'bulk', qty: 2 }],
    have: { rag: -1, fiber: 2.5, mask: 4 },
    expandIntermediates: true,
  });
  const p = parseProgress(text);
  assert.deepEqual(p.targets, [{ id: 'bulk', qty: 2 }]);
  assert.deepEqual(p.have, { mask: 4 });
});

test('campi di tipo sbagliato restituiscono null', () => {
  assert.equal(parseProgress('{"v":1,"targets":"x","have":{},"expandIntermediates":true}'), null);
});

test('reconcile scarta gli oggetti spariti dopo una patch e li elenca', () => {
  const items = { hood: loadSample().hood };
  const p = {
    v: 1,
    targets: [{ id: 'hood', qty: 1 }, { id: 'old-sword', qty: 1 }],
    have: { hood: 1, 'old-ore': 9 },
    expandIntermediates: true,
  };
  const r = reconcile(p, items);
  assert.deepEqual(r.dropped.sort(), ['old-ore', 'old-sword']);
  assert.deepEqual(r.progress.targets, [{ id: 'hood', qty: 1 }]);
  assert.deepEqual(r.progress.have, { hood: 1 });
});
