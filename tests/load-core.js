// Estrae <script id="core"> da index.html e lo esegue in un contesto vm isolato.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadCore(deps = {}) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('index.html: <script id="core"> non trovato');
  const ctx = vm.createContext({ console, ...deps });
  vm.runInContext(m[1], ctx);
  return ctx.__core;
}

function loadSample() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'items.json'), 'utf8'));
}

// Gli oggetti creati nel contesto vm hanno un altro prototipo: deepEqual strict li rifiuta.
const plain = (x) => JSON.parse(JSON.stringify(x));

module.exports = { loadCore, loadSample, plain };
