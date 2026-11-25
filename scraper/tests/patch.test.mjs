import test from 'node:test';
import assert from 'node:assert/strict';
import { latestPatchDate } from '../patch.mjs';

const page = (...titles) => '<main><h1>Patch Notes</h1>' + titles.map((t) => `<section><h2>${t}</h2><p>x</p></section>`).join('') + '<h2>ArcheAge Chronicles</h2></main>';

test('prende la data della prima voce (la più recente), anche con il badge "Latest"', () => {
  assert.equal(latestPatchDate(page('November 25, 2026 <span>Latest</span>', 'November 17, 2026')), '2026-11-25');
});

test('giorno a una cifra e mese in minuscolo: data ISO con zeri', () => {
  assert.equal(latestPatchDate(page('march 3, 2027')), '2027-03-03');
});

test('titoli che non sono date vengono saltati; senza date restituisce null', () => {
  assert.equal(latestPatchDate('<main><h2>Intro</h2><h2>Smarch 5, 2026</h2><h2>December 1, 2026</h2></main>'), '2026-12-01');
  assert.equal(latestPatchDate('<main><h1>Patch Notes</h1><h2>Equipment</h2></main>'), null);
  assert.equal(latestPatchDate(''), null);
});
