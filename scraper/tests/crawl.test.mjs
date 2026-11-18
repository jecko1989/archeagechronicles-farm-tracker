import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { CATEGORIES, CATEGORY_TYPES, crawlAll, listItemLinks, listItemIcons, listItemTypes, maxPage } from '../crawl.mjs';

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

test('housing è tra le categorie del crawler (case, annessi e postazioni di Ingegneria)', () => {
  assert.ok(CATEGORIES.includes('housing'));
});

// elenco finto di Housing: la terza colonna è il tipo (come su MetaForge)
const row = (slug, name, type) => `<tr><td><a href="/archeage-chronicles/database/housing/${slug}"><img src="https://x/icons/${slug.toUpperCase()}.webp"></a></td>` +
  `<td><a href="/archeage-chronicles/database/housing/${slug}">${name}</a></td><td>${type}</td><td>Common</td></tr>`;
const LISTING = '<main><h1>Housing</h1><table><tbody>' +
  row('casa', 'Casa', 'Houses') + row('old', 'Old', 'Annexes') + row('deco', 'Deco', 'Decoration') + '</tbody></table></main>';

test('listItemTypes: tipo (terza colonna) di ogni oggetto elencato', () => {
  assert.deepEqual(listItemTypes(LISTING, 'housing'), { casa: 'Houses', old: 'Annexes', deco: 'Decoration' });
  assert.deepEqual(listItemTypes(LISTING, 'armor'), {});
});

test('housing si limita ai tipi che si craftano con Ingegneria: case, annessi e postazioni', () => {
  assert.deepEqual(CATEGORY_TYPES.housing, ['Houses', 'Annexes', 'Stations']);
});

// ---- crawlAll con pagine finte: una nuova categoria senza riscaricare ciò che già si ha ----
const fakeSite = () => {
  const calls = [];
  const craft = '<h2>How to Craft Casa</h2><p>Crafted at the Bench with Engineering level 1. Costs 10 Gold.</p><ul>' +
    '<li><span>1 x <a href="/archeage-chronicles/database/housing/casa">Casa</a></span></li>' +
    '<li><span>5 x <a href="/archeage-chronicles/database/materials/stone">Stone</a></span></li>' +
    '<li><span>2 x <a href="/archeage-chronicles/database/materials/newmat">New Mat</a></span></li></ul>';
  const pages = {
    '/database/housing/page/1': LISTING,
    '/database/housing/casa': `<main><h1>Casa</h1><dl><div><dt>Type</dt><dd>Houses</dd></div></dl><section>${craft}</section></main>`,
    '/database/materials/newmat': '<main><h1>New Mat</h1></main>',
  };
  const getHtml = async (url) => {
    const key = url.slice(url.indexOf('/database'));
    calls.push(key);
    if (!(key in pages)) throw new Error('pagina non prevista: ' + key);
    return pages[key];
  };
  return { getHtml, calls };
};

test('crawlAll con known: salta gli oggetti già noti e segue solo quelli nuovi', async () => {
  const site = fakeSite();
  const items = await crawlAll(site.getHtml, { categories: ['housing'], delayMs: 0, known: ['old', 'stone'] });
  assert.deepEqual(Object.keys(items).sort(), ['casa', 'newmat']);
  assert.equal(items.casa.icon, 'CASA.webp');
  assert.deepEqual(items.casa.crafts[0].ingredients, [{ id: 'stone', qty: 5 }, { id: 'newmat', qty: 2 }]);
  assert.equal(site.calls.some((c) => /old|stone/.test(c)), false, 'non deve riscaricare old né stone');
});

test('crawlAll con filtro per tipo: gli arredi (Decoration) non si scaricano', async () => {
  const site = fakeSite();
  await crawlAll(site.getHtml, { categories: ['housing'], delayMs: 0, known: ['old', 'stone'] });
  assert.equal(site.calls.some((c) => /deco/.test(c)), false, 'deco è Decoration: va saltato');
  assert.ok(site.calls.some((c) => /housing\/casa/.test(c)));
});

test('crawlAll senza known: scarica anche gli oggetti elencati già presenti (old)', async () => {
  const site = fakeSite();
  await assert.rejects(crawlAll(site.getHtml, { categories: ['housing'], delayMs: 0 }), /old|stone/);
});

test('maxPage legge il numero di pagina più alto dalla paginazione', needs, () => {
  assert.equal(maxPage(listing), 3);
});
