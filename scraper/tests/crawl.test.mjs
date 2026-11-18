import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { listItemLinks, listItemIcons, maxPage } from '../crawl.mjs';

// La pagina di elenco è una copia di una pagina di MetaForge e non sta nella repo pubblica
// (`node scraper/capture-fixtures.mjs` la scarica); senza, questi test vengono saltati.
const file = new URL('./fixtures/listing-armor-1.html', import.meta.url);
const listing = existsSync(file) ? readFileSync(file, 'utf8') : '';
const needs = { skip: listing ? false : 'fixture HTML assente (node scraper/capture-fixtures.mjs)' };

test('listItemLinks: slug unici degli oggetti, senza link di paginazione', needs, () => {
  const slugs = listItemLinks(listing, 'armor');
  assert.ok(slugs.includes('ancient-soldiers-armor'));
  assert.equal(slugs.length, new Set(slugs).size);
  assert.ok(slugs.length >= 40);
  assert.ok(slugs.every((s) => !s.includes('/') && s !== 'page'));
});

test('listItemLinks: ignora le altre categorie', needs, () => {
  assert.deepEqual(listItemLinks(listing, 'weapons'), []);
});

test('listItemIcons: nome file dell icona di ogni oggetto, tutti gli oggetti elencati', needs, () => {
  const icons = listItemIcons(listing, 'armor');
  assert.equal(icons['ancient-soldiers-armor'], 'UI_Item_Equipment_Amor_Metal_Suit_02.webp');
  const slugs = listItemLinks(listing, 'armor');
  assert.deepEqual(Object.keys(icons).sort(), [...slugs].sort());
  assert.ok(Object.values(icons).every((f) => /^[\w.-]+\.webp$/.test(f)));
});

test('listItemIcons: ignora le altre categorie', needs, () => {
  assert.deepEqual(listItemIcons(listing, 'weapons'), {});
});

test('maxPage legge il numero di pagina più alto dalla paginazione', needs, () => {
  assert.equal(maxPage(listing), 3);
});
