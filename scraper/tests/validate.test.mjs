import test from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../validate.mjs';

const raw = (name) => ({ name, category: 'materials', rarity: 'Common', type: 'Raw Materials', crafts: [] });
const many = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`i${i}`, raw(`I${i}`)]));
const crafted = (ingredients, profession = 'Tailoring') => ({
  name: 'X', category: 'armor', rarity: 'Rare', type: 'Cloth',
  crafts: [{ profession, level: 1, stations: ['Workbench'], gold: 0, ingredients }],
});

test('meno dell 80% degli oggetti precedenti è un errore', () => {
  assert.equal(validate(many(79), many(100)).some((e) => e.startsWith('count:')), true);
});

test('esattamente l 80% è accettato', () => {
  assert.deepEqual(validate(many(80), many(100)), []);
});

test('con prev vuoto il controllo del conteggio non scatta', () => {
  assert.deepEqual(validate(many(3), {}), []);
});

test('ingrediente assente dai dati: unknown-ingredient', () => {
  const next = { ...many(1), x: crafted([{ id: 'ghost', qty: 1 }]) };
  assert.deepEqual(validate(next, {}), ['unknown-ingredient:ghost']);
});

test('ricetta senza ingredienti: empty-recipe', () => {
  assert.deepEqual(validate({ x: crafted([]) }, {}), ['empty-recipe:x']);
});

test('ricetta senza professione: missing-profession', () => {
  const next = { ...many(1), x: crafted([{ id: 'i0', qty: 1 }], '') };
  assert.deepEqual(validate(next, {}), ['missing-profession:x']);
});

test('dati validi: nessun errore', () => {
  const next = { ...many(1), x: crafted([{ id: 'i0', qty: 2 }]) };
  assert.deepEqual(validate(next, {}), []);
});
