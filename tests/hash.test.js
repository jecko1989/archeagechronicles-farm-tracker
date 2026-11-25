// Link diretto: #craft/<id>[:qty],<id>[:qty]
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore, loadSample, plain } = require('./load-core');

const core = loadCore();
const items = loadSample(); // hood e textile sono craftabili, rag è un grezzo
const parse = (h) => plain(core.parseHash(h, items));

test('buildHash: tab, id e quantità (omessa se 1); nessun obiettivo = niente hash', () => {
  assert.equal(core.buildHash('craft', [{ id: 'hood', qty: 1 }]), '#craft/hood');
  assert.equal(core.buildHash('trade', [{ id: 'hood', qty: 2 }, { id: 'textile', qty: 1 }]), '#trade/hood:2,textile');
  assert.equal(core.buildHash('craft', []), '');
  assert.equal(core.buildHash('boh', [{ id: 'hood', qty: 1 }]), '#craft/hood');
});

test('parseHash è l inverso di buildHash', () => {
  const targets = [{ id: 'hood', qty: 3 }, { id: 'textile', qty: 1 }];
  assert.deepEqual(parse(core.buildHash('trade', targets)), { tab: 'trade', targets });
});

test('parseHash scarta oggetti sconosciuti, grezzi e nomi di prototipo', () => {
  assert.deepEqual(parse('#craft/ghost,hood:2,rag,constructor,toString'), { tab: 'craft', targets: [{ id: 'hood', qty: 2 }] });
});

test('parseHash: quantità non valide valgono 1, i doppioni si sommano', () => {
  assert.deepEqual(parse('#craft/hood:0,textile:abc,hood:-3,textile:2').targets, [{ id: 'hood', qty: 2 }, { id: 'textile', qty: 3 }]);
  assert.equal(parse('#craft/hood:99999999999').targets[0].qty, 1);
});

test('parseHash: link non validi o senza oggetti validi restituiscono null', () => {
  for (const h of ['', '#', '#craft', '#craft/', '#foo/hood', '#craft/ghost', '#craft/rag', undefined]) assert.equal(parse(h), null, String(h));
});
