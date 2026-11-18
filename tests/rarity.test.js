const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore, plain } = require('./load-core');

const core = loadCore();
const sortByRarity = (entries) => plain(core.sortByRarity(entries));
const names = (entries) => sortByRarity(entries).map(([, it]) => it.name);
const e = (id, name, rarity) => [id, { name, rarity }];

test('dal più scarso al più forte: common, uncommon, rare, epic, legendary', () => {
  const list = [e('a', 'A', 'Legendary'), e('b', 'B', 'Epic'), e('c', 'C', 'Rare'), e('d', 'D', 'Uncommon'), e('e', 'E', 'Common')];
  assert.deepEqual(names(list), ['E', 'D', 'C', 'B', 'A']);
});

test('a parità di rarità l ordine è alfabetico', () => {
  const list = [e('1', 'Zeta', 'Rare'), e('2', 'Alfa', 'Rare'), e('3', 'Mu', 'Rare')];
  assert.deepEqual(names(list), ['Alfa', 'Mu', 'Zeta']);
});

test('prima la rarità, poi l alfabeto: un Rare "A" viene dopo un Uncommon "Z"', () => {
  assert.deepEqual(names([e('1', 'A', 'Rare'), e('2', 'Z', 'Uncommon')]), ['Z', 'A']);
});

test('maiuscole e minuscole non contano né nella rarità né nel nome', () => {
  const list = [e('1', 'beta', 'EPIC'), e('2', 'Alfa', 'epic'), e('3', 'Gamma', 'uncommon')];
  assert.deepEqual(names(list), ['Gamma', 'Alfa', 'beta']);
});

test('rarità sconosciuta o mancante: in fondo, in ordine alfabetico', () => {
  const list = [e('1', 'Q', 'Mythic'), e('2', 'B', 'Legendary'), e('3', 'A', undefined), e('4', 'C', 'Common')];
  assert.deepEqual(names(list), ['C', 'B', 'A', 'Q']);
});

test('non modifica l array ricevuto', () => {
  const list = [e('1', 'B', 'Epic'), e('2', 'A', 'Uncommon')];
  const before = JSON.stringify(list);
  core.sortByRarity(list);
  assert.equal(JSON.stringify(list), before);
});
