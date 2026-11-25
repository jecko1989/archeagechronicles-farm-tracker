// Piani salvati con nome: parsePlans / serializePlans / upsertPlan / planProgress
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore, loadSample, plain } = require('./load-core');

const core = loadCore();
const items = loadSample(); // hood e textile esistono, rag pure; "old" no
const progress = (over) => ({ v: 1, targets: [{ id: 'hood', qty: 2 }], have: { rag: 5 }, prices: { rag: 10 }, expandIntermediates: true, deliveries: [{ family: 'ingot', tier: 'standard', packs: 1, input: 9, received: 11, at: '' }], ...over });

test('upsertPlan salva senza consegne e il round trip con parsePlans è identico', () => {
  const plans = plain(core.upsertPlan([], 'Cappucci', progress(), '2026-11-25T10:00:00Z'));
  assert.equal(plans.length, 1);
  assert.deepEqual(plans[0].p, { v: 1, targets: [{ id: 'hood', qty: 2 }], have: { rag: 5 }, prices: { rag: 10 }, expandIntermediates: true, deliveries: [] });
  assert.deepEqual(plain(core.parsePlans(core.serializePlans(plans))), plans);
});

test('upsertPlan: stesso nome sostituisce, nome nuovo aggiunge; la copia non condivide riferimenti', () => {
  const cur = progress();
  let plans = core.upsertPlan([], 'A', cur, 't1');
  plans = core.upsertPlan(plans, 'B', cur, 't2');
  cur.targets[0].qty = 9; // modifiche successive non toccano il piano salvato
  plans = core.upsertPlan(plans, ' A ', progress({ targets: [{ id: 'textile', qty: 1 }] }), 't3');
  assert.deepEqual(plain(plans).map((p) => [p.name, p.at, p.p.targets[0].id, p.p.targets[0].qty]), [['A', 't3', 'textile', 1], ['B', 't2', 'hood', 2]]);
});

test('upsertPlan: nome vuoto o troppo lungo restituisce null', () => {
  assert.equal(core.upsertPlan([], '   ', progress(), 't'), null);
  assert.equal(core.upsertPlan([], 'x'.repeat(41), progress(), 't'), null);
  assert.notEqual(core.upsertPlan([], 'x'.repeat(40), progress(), 't'), null);
});

test('parsePlans: JSON rotto, versione sbagliata e voci non valide danno [] o scartano la voce', () => {
  assert.deepEqual(plain(core.parsePlans('{bad')), []);
  assert.deepEqual(plain(core.parsePlans('{"v":2,"plans":[]}')), []);
  assert.deepEqual(plain(core.parsePlans('')), []);
  const good = plain(core.upsertPlan([], 'ok', progress(), 't'))[0];
  const text = JSON.stringify({ v: 1, plans: [good, { name: '', at: '', p: good.p }, { name: 'senza p', at: '' }, null, { ...good, name: 'ok' }, { name: 'x'.repeat(41), p: good.p }] });
  assert.deepEqual(plain(core.parsePlans(text)).map((p) => p.name), ['ok']); // duplicato e voci non valide scartati
});

test('planProgress sostituisce selezione, possedute e prezzi ma tiene le consegne correnti e scarta oggetti spariti', () => {
  const saved = plain(core.upsertPlan([], 'P', progress({ targets: [{ id: 'hood', qty: 3 }, { id: 'old', qty: 1 }], have: { rag: 1, old: 4 }, prices: { rag: 7, old: 2 } }), 't'))[0];
  const current = progress({ targets: [{ id: 'textile', qty: 1 }], have: {}, prices: {}, deliveries: [] });
  const r = plain(core.planProgress(saved, current, items));
  assert.deepEqual(r.progress.targets, [{ id: 'hood', qty: 3 }]);
  assert.deepEqual(r.progress.have, { rag: 1 });
  assert.deepEqual(r.progress.prices, { rag: 7 });
  assert.deepEqual(r.progress.deliveries, []);
  assert.deepEqual(r.dropped.sort(), ['old']);
});
