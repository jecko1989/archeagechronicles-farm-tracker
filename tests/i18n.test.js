const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore } = require('./load-core');

const core = loadCore();

test('inglese e italiano hanno esattamente le stesse chiavi', () => {
  const en = Object.keys(core.STRINGS.en).sort();
  const it = Object.keys(core.STRINGS.it).sort();
  assert.deepEqual(en, it);
});

test('la lingua di base è l inglese quando la lingua è sconosciuta', () => {
  assert.equal(core.translator('xx')('retry'), 'Retry');
  assert.equal(core.translator(undefined)('retry'), 'Retry');
});

test('italiano selezionabile', () => {
  assert.equal(core.translator('it')('retry'), 'Riprova');
});

test('interpolazione dei segnaposto {nome}', () => {
  assert.equal(core.translator('en')('remove', { name: 'Cultist Hood' }), 'Remove Cultist Hood');
  assert.equal(core.translator('en')('progress_line', { have: 46, need: 123 }), '46 / 123 materials');
});

test('plurale: 1 usa la chiave _one, gli altri valori la chiave base', () => {
  const t = core.translator('en');
  assert.equal(t('pick_count', { n: 1 }), '1 item');
  assert.equal(t('pick_count', { n: 0 }), '0 items');
  assert.equal(t('pick_count', { n: 179 }), '179 items');
  assert.equal(core.translator('it')('pick_count', { n: 1 }), '1 oggetto');
});

test('chiave inesistente: restituisce la chiave, non lancia', () => {
  assert.equal(core.translator('en')('does_not_exist'), 'does_not_exist');
});

test('i nomi delle sezioni esistono per tutte le categorie dei dati', () => {
  const cats = ['weapons', 'armor', 'accessories', 'bags', 'gliders', 'consumables', 'tools', 'materials', 'housing'];
  for (const lang of ['en', 'it']) for (const c of cats) assert.ok(`sec_${c}` in core.STRINGS[lang], `${lang} sec_${c}`);
});
