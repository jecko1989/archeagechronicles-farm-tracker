// tipPosition: dove mettere il tooltip rispetto al puntatore (lo segue mentre si muove).
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore, plain } = require('./load-core');

const core = loadCore();
const pos = (o) => plain(core.tipPosition({ w: 300, h: 200, vw: 1280, vh: 900, ...o }));

test('a destra e sotto il puntatore', () => {
  assert.deepEqual(pos({ x: 500, y: 300 }), { left: 514, top: 314 });
});

test('niente posto a destra: a sinistra del puntatore', () => {
  assert.deepEqual(pos({ x: 1100, y: 300 }), { left: 1100 - 300 - 14, top: 314 });
});

test('in basso non c è posto: sale quanto basta per restare nello schermo', () => {
  assert.equal(pos({ x: 500, y: 850 }).top, 900 - 200 - 8);
});

test('più alto dello schermo: parte dal bordo alto, mai sopra', () => {
  assert.equal(pos({ x: 500, y: 300, h: 2000 }).top, 8);
});

test('schermo più stretto del tooltip: resta a 8px dal bordo sinistro, mai fuori', () => {
  assert.equal(pos({ x: 100, y: 300, vw: 320 }).left, 8);
});
