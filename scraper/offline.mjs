// Incolla i dati dentro index.html: il risultato è un unico file che funziona con doppio clic, senza server né rete.
export function buildOffline(html, { meta, items, overrides = {}, trade, routes }) {
  if (!html.includes('<script id="config">')) throw new Error('index.html: <script id="config"> non trovato');
  // già incorporati: sostituisce. Il contenuto non ha "<" (è escapato), quindi [^<]* non può scavalcare un altro script.
  const clean = html.replace(/<script id="embedded-data" type="application\/json">[^<]*<\/script>\n?/, '');
  const json = JSON.stringify({ meta, items, overrides, trade, routes }).replace(/</g, '\\u003c'); // "</script>" nei dati non chiude il tag
  // funzione al posto di una stringa: i "$" nei dati non devono essere letti come segnaposto di replace()
  return clean.replace('<script id="config">', () => `<script id="embedded-data" type="application/json">${json}</script>\n<script id="config">`);
}
