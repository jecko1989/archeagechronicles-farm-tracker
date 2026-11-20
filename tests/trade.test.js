// Tab Trade: modello dati (normalizeTrade, tradeInfo), registro consegne (effectiveRatio) e piano (tradePlan).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadCore, plain } = require('./load-core');

const core = loadCore();
const fixture = () => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'trade.json'), 'utf8'));
const normalizeTrade = (raw) => plain(core.normalizeTrade(raw));
const tradeInfo = (trade, id) => plain(core.tradeInfo(trade, id));

// ---- Task 1: modello dati ----
test('la fixture è valida e normalizeTrade la restituisce uguale', () => {
  assert.deepEqual(normalizeTrade(fixture()), fixture());
});

test('senza posts, packs o limits restituisce null', () => {
  assert.equal(normalizeTrade(null), null);
  assert.equal(normalizeTrade({}), null);
  assert.equal(normalizeTrade({ ...fixture(), packs: undefined }), null);
  assert.equal(normalizeTrade({ ...fixture(), posts: undefined }), null);
  assert.equal(normalizeTrade({ ...fixture(), limits: undefined }), null);
});

test('un pack con input non intero positivo rende il file non valido', () => {
  for (const bad of [0, 2.5]) {
    const t = fixture();
    t.packs.fine.input = bad;
    assert.equal(normalizeTrade(t), null, 'input ' + bad);
  }
});

test('un rapporto non numerico o <= 0 diventa null, il resto resta valido', () => {
  for (const bad of ['1.2', -1]) {
    const t = fixture();
    t.ratios.default.fine = bad;
    const r = normalizeTrade(t);
    assert.notEqual(r, null);
    assert.equal(r.ratios.default.fine, null);
    assert.equal(r.ratios.default.standard, 1.22);
  }
});

test('tradeInfo riconosce livello, famiglia e avamposto', () => {
  const t = fixture();
  assert.deepEqual(tradeInfo(t, 'fine-lumber'), { tier: 'fine', family: 'lumber', post: 'seaglass-harbor' });
  assert.deepEqual(tradeInfo(t, 'superior-stone'), { tier: 'superior', family: 'stone', post: 'shadow-path' });
  assert.equal(tradeInfo(t, 'standard-archeum').post, 'shadow-path');
});

test('tradeInfo restituisce null per ciò che non si commercia', () => {
  const t = fixture();
  for (const id of ['standard-bonecraft', 'blank-trade-certificate', 'hood', '']) assert.equal(tradeInfo(t, id), null, id);
});
