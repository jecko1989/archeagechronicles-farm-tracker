// tipPosition: dove mettere il tooltip. Con `clear` (pannello da non coprire, la colonna di sinistra) va a destra del pannello.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore, plain } = require('./load-core');

const core = loadCore();
const pos = (o) => plain(core.tipPosition({ w: 300, h: 200, vw: 1280, vh: 900, ...o }));
const panel = { left: 24, right: 364, top: 80, bottom: 800 }; // colonna di sinistra a 340px

test('senza pannello da liberare: a destra e sotto il puntatore', () => {
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

test('oggetto nella colonna di sinistra: il tooltip sta a destra del pannello, allineato alla riga, senza coprire la lista', () => {
  const r = pos({ x: 200, y: 400, anchor: { top: 390, left: 40, right: 340 }, clear: panel });
  assert.deepEqual(r, { left: panel.right + 12, top: 390 });
  assert.ok(r.left >= panel.right, 'non deve sovrapporsi al pannello');
});

test('colonna di sinistra, riga in fondo: il tooltip si alza per restare nello schermo ma resta fuori dal pannello', () => {
  const r = pos({ x: 200, y: 850, anchor: { top: 840 }, clear: panel });
  assert.equal(r.left, panel.right + 12);
  assert.equal(r.top, 900 - 200 - 8);
});

test('schermo stretto (nessun posto a destra del pannello): ripiega sul puntatore', () => {
  const wide = { left: 16, right: 700, top: 80, bottom: 800 };
  assert.deepEqual(pos({ x: 200, y: 300, vw: 800, anchor: { top: 290 }, clear: wide }), { left: 214, top: 314 });
});
