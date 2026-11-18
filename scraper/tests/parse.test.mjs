import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { parseItemPage } from '../parse.mjs';

const fixtureUrl = (name) => new URL(`./fixtures/${name}.html`, import.meta.url);
const fx = (name) => readFileSync(fixtureUrl(name), 'utf8');
// Le pagine HTML di esempio sono copie di pagine di MetaForge e non stanno nella repo pubblica:
// `node scraper/capture-fixtures.mjs` le scarica; senza, i test che le usano vengono saltati.
const needs = (...names) => ({ skip: names.every((n) => existsSync(fixtureUrl(n))) ? false : 'fixture HTML assenti (node scraper/capture-fixtures.mjs)' });

test('cultist-hood: dati base e ricetta completa', needs('cultist-hood'), () => {
  const { item, refs } = parseItemPage(fx('cultist-hood'), { slug: 'cultist-hood', category: 'armor' });
  assert.equal(item.name, 'Cultist Hood');
  assert.equal(item.category, 'armor');
  assert.equal(item.rarity, 'Uncommon');
  assert.equal(item.type, 'Cloth');
  assert.deepEqual(item.crafts, [{
    profession: 'Tailoring', level: 1,
    stations: ['Armor Workbench', 'Light Armor Workbench'], gold: 3000,
    ingredients: [
      { id: 'standard-textile', qty: 2 }, { id: 'rag-scrap', qty: 20 }, { id: 'cultist-ritual-mask', qty: 8 },
    ],
  }]);
  assert.deepEqual(refs, [
    { id: 'standard-textile', category: 'materials' }, { id: 'rag-scrap', category: 'materials' },
    { id: 'cultist-ritual-mask', category: 'materials' },
  ]);
});

test('standard-textile: una sola ricetta anche se Atelier compare quattro volte', needs('standard-textile'), () => {
  const { item } = parseItemPage(fx('standard-textile'), { slug: 'standard-textile', category: 'materials' });
  assert.equal(item.type, 'Refined Materials');
  assert.equal(item.crafts.length, 1);
  const c = item.crafts[0];
  assert.equal(c.profession, 'Cloth');
  assert.equal(c.level, 1);
  assert.deepEqual(c.stations, ['Atelier']);
  assert.equal(c.gold, 100);
  assert.deepEqual(c.ingredients, [
    { id: 'wild-fiber', qty: 3 }, { id: 'sweetgrass-powder', qty: 5 }, { id: 'rag-scrap', qty: 5 },
  ]);
});

test('lifeflow-potion: yield 5 e tre stazioni separate da virgole e "or"', needs('lifeflow-potion'), () => {
  const { item } = parseItemPage(fx('lifeflow-potion'), { slug: 'lifeflow-potion', category: 'consumables' });
  assert.deepEqual(item.crafts[0], {
    profession: 'Alchemy', level: 1, stations: ['Alchemy Workbench', 'Bonfire', 'Kitchen Countertop'],
    gold: 125, yield: 5, ingredients: [{ id: 'roseberry', qty: 9 }],
  });
});

test('senza la frase "You\'ll receive N per craft" il campo yield non c\'è', needs('cultist-hood'), () => {
  const { item } = parseItemPage(fx('cultist-hood'), { slug: 'cultist-hood', category: 'armor' });
  assert.equal('yield' in item.crafts[0], false);
});

test('senza riga Costs il gold vale 0', needs('no-gold'), () => {
  const { item } = parseItemPage(fx('no-gold'), { slug: 'cultist-hood', category: 'armor' });
  assert.equal(item.crafts[0].gold, 0);
  assert.equal(item.crafts[0].ingredients.length, 3);
});

test('senza sezione How to Craft: crafts vuoto e nessun ref', () => {
  const html = '<main><h1>Rag Scrap</h1><dl><div><dt>Rarity</dt><dd>Common</dd></div><div><dt>Type</dt><dd>Raw Materials</dd></div></dl></main>';
  const { item, refs } = parseItemPage(html, { slug: 'rag-scrap', category: 'materials' });
  assert.deepEqual(item, { name: 'Rag Scrap', category: 'materials', rarity: 'Common', type: 'Raw Materials', crafts: [] });
  assert.deepEqual(refs, []);
});

test('frase di crafting non riconosciuta: professione vuota, così la guardia la segnala', () => {
  const html = '<main><h1>Odd Thing</h1><section><h2>How to Craft Odd Thing</h2><p>Crafted by hand.</p>' +
    '<ul><li><span>2 x <a href="/archeage-chronicles/database/materials/rag-scrap">Rag Scrap</a></span></li></ul></section></main>';
  const { item } = parseItemPage(html, { slug: 'odd-thing', category: 'other' });
  assert.equal(item.crafts[0].profession, '');
  assert.deepEqual(item.crafts[0].ingredients, [{ id: 'rag-scrap', qty: 2 }]);
});
