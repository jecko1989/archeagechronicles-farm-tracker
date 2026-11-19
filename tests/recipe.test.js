// directIngredients: la ricetta diretta di ogni oggetto scelto (un solo livello, senza scendere nei lavorati), per la quantità richiesta.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore, loadSample, plain } = require('./load-core');

const core = loadCore();
const directIngredients = (...args) => plain(core.directIngredients(...args));
const items = loadSample(); // hood = 2 textile + 20 rag + 8 mask; bulk = 10 rag, yield 5

test('ricetta diretta in ordine di ricetta, senza scendere nei lavorati', () => {
  assert.deepEqual(directIngredients(items, [{ id: 'hood', qty: 1 }]), [
    { id: 'hood', qty: 1, times: 1, ingredients: [{ id: 'textile', qty: 2 }, { id: 'rag', qty: 20 }, { id: 'mask', qty: 8 }] },
  ]);
});

test('la quantità richiesta moltiplica gli ingredienti', () => {
  const [r] = directIngredients(items, [{ id: 'hood', qty: 3 }]);
  assert.equal(r.times, 3);
  assert.deepEqual(r.ingredients, [{ id: 'textile', qty: 6 }, { id: 'rag', qty: 60 }, { id: 'mask', qty: 24 }]);
});

test('con yield > 1 si arrotondano per eccesso i craft', () => {
  const [r] = directIngredients(items, [{ id: 'bulk', qty: 6 }]); // 6 pezzi, 5 per craft -> 2 craft
  assert.equal(r.times, 2);
  assert.deepEqual(r.ingredients, [{ id: 'rag', qty: 20 }]);
});

test('più obiettivi: un blocco per obiettivo, nell ordine scelto', () => {
  const r = directIngredients(items, [{ id: 'robe', qty: 1 }, { id: 'hood', qty: 1 }]);
  assert.deepEqual(r.map((x) => x.id), ['robe', 'hood']);
});

test('un obiettivo grezzo o sconosciuto non ha ricetta: viene saltato', () => {
  assert.deepEqual(directIngredients(items, [{ id: 'rag', qty: 5 }, { id: 'ghost', qty: 1 }]), []);
});
