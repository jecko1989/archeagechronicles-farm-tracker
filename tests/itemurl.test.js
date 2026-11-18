const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore, loadSample } = require('./load-core');

const core = loadCore();
const BASE = 'https://metaforge.app/archeage-chronicles/database';

test('indirizzo MetaForge = database/<categoria>/<slug>', () => {
  const items = { 'standard-bonecraft': { category: 'materials' }, 'cultist-hood': { category: 'armor' } };
  assert.equal(core.itemUrl(items, 'standard-bonecraft'), `${BASE}/materials/standard-bonecraft`);
  assert.equal(core.itemUrl(items, 'cultist-hood'), `${BASE}/armor/cultist-hood`);
});

test('vale per le sezioni dei dati di prova (case e annessi compresi)', () => {
  const items = { ...loadSample(), 'gothic-annex-a-2': { category: 'housing' } };
  assert.equal(core.itemUrl(items, 'hood'), `${BASE}/armor/hood`);
  assert.equal(core.itemUrl(items, 'gothic-annex-a-2'), `${BASE}/housing/gothic-annex-a-2`);
});

test('oggetto sconosciuto o senza categoria: stringa vuota, niente link', () => {
  assert.equal(core.itemUrl({}, 'ghost'), '');
  assert.equal(core.itemUrl({ x: { name: 'X' } }, 'x'), '');
  assert.equal(core.itemUrl(null, 'x'), '');
});

test('caratteri strani nel nome vengono codificati, non rompono l indirizzo', () => {
  const items = { 'a b/c?d': { category: 'm&n' } };
  assert.equal(core.itemUrl(items, 'a b/c?d'), `${BASE}/m%26n/a%20b%2Fc%3Fd`);
});
