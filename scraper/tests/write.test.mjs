import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeData } from '../write.mjs';

const raw = (name) => ({ name, category: 'materials', rarity: 'Common', type: 'Raw Materials', crafts: [] });
const dir = () => mkdtempSync(join(tmpdir(), 'aa-write-'));
const read = (d, f) => readFileSync(join(d, f), 'utf8');

test('prima scrittura: items.json ordinato con newline finale e meta.json', () => {
  const d = dir();
  const r = writeData(d, { b: raw('B'), a: raw('A') }, new Date('2026-11-18T00:00:00Z'));
  assert.equal(r.changed, true);
  const text = read(d, 'items.json');
  assert.deepEqual(Object.keys(JSON.parse(text)), ['a', 'b']);
  assert.ok(text.endsWith('}\n'));
  assert.deepEqual(JSON.parse(read(d, 'meta.json')), { updatedAt: '2026-11-18T00:00:00.000Z', count: 2, schema: 1 });
});

test('stessi oggetti: changed false e nessun file toccato', () => {
  const d = dir();
  writeData(d, { a: raw('A') }, new Date('2026-11-18T00:00:00Z'));
  const metaBefore = read(d, 'meta.json');
  const r = writeData(d, { a: raw('A') }, new Date('2026-12-01T00:00:00Z'));
  assert.equal(r.changed, false);
  assert.equal(read(d, 'meta.json'), metaBefore);
});

test('oggetti diversi: changed true e updatedAt nuovo', () => {
  const d = dir();
  writeData(d, { a: raw('A') }, new Date('2026-11-18T00:00:00Z'));
  const r = writeData(d, { a: raw('A'), b: raw('B') }, new Date('2026-12-01T00:00:00Z'));
  assert.equal(r.changed, true);
  const meta = JSON.parse(read(d, 'meta.json'));
  assert.equal(meta.updatedAt, '2026-12-01T00:00:00.000Z');
  assert.equal(meta.count, 2);
});

test('items.json esistente con fine riga CRLF (checkout Windows) conta come invariato', () => {
  const d = dir();
  writeData(d, { a: raw('A') }, new Date('2026-11-18T00:00:00Z'));
  const crlf = read(d, 'items.json').replace(/\n/g, '\r\n');
  writeFileSync(join(d, 'items.json'), crlf);
  assert.equal(writeData(d, { a: raw('A') }).changed, false);
});
