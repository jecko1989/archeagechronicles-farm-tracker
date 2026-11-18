# ArcheAge Chronicles Farm Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una pagina HTML unica che calcola i materiali grezzi da farmare per craftare gli oggetti scelti, con dati letti da `data/*.json` di una repo GitHub aggiornata da uno scraper di MetaForge.

**Architecture:** `index.html` contiene tutto: un blocco `<script id="core">` con la logica pura (calcolo, progressi, caricamento dati), testato in Node estraendo quel blocco con `vm`, e un blocco `<script id="ui">` per il DOM. `scraper/` (Node 20 + Playwright + cheerio) genera `data/items.json` e `data/meta.json`; una GitHub Action lo riesegue ogni settimana.

**Tech Stack:** HTML/CSS/JS vanilla (nessun build, nessun framework), `node:test` per i test, Playwright + cheerio per lo scraper, GitHub Actions + Pages.

**Spec:** `docs/superpowers/specs/2026-11-18-archeage-farm-tracker-design.md`

## Global Constraints
- Pagina HTML unica, senza build e senza dipendenze, apribile anche da file locale (quindi niente `<script type="module">` né `fetch` relativi quando `location.protocol === 'file:'`).
- `DATA_BASE_URL` costante in cima al file, default `https://raw.githubusercontent.com/jecko1989/archeagechronicles-farm-tracker/main/data/`; con la pagina servita da http(s) sullo stesso host di Pages usa `./data/`; override con `?data=<url>` (serve ai test).
- Repo: `jecko1989/archeagechronicles-farm-tracker`, branch `main`. Cartella locale: `C:\workspace\archeage-farm-tracker`.
- Scraper: Node 20 + Playwright; rate limit ~1 richiesta/secondo; User-Agent identificabile; ignora `/recipes/...`.
- Guardie scraper: numero oggetti non inferiore all'80% del precedente, nessun ingrediente con id sconosciuto, nessuna ricetta senza ingredienti; se falliscono: exit code ≠ 0 e nessuna scrittura.
- Action: cron settimanale (lunedì) + `workflow_dispatch`; commit solo se `data/` è cambiata.
- Output dati ordinato e deterministico (chiavi ordinate, 2 spazi, newline finale).
- Progressi solo in `localStorage` (chiave `aa-farm-progress-v1`) + Esporta/Importa JSON. Nomi in inglese come su MetaForge. Nessuna immagine copiata; footer con crediti e link a MetaForge e data dell'ultimo aggiornamento dati.
- Tema scuro e chiaro; layout usabile a schermo stretto.

## Decisioni mie rispetto allo spec (da ricontrollare)
- Schema oggetto con due campi in più: `type` (riga "Type" della pagina, per raggruppare i materiali grezzi) e `crafts[].yield` opzionale (default 1).
- Cache dati in `localStorage` (non IndexedDB). `// ponytail: ~5 MB di tetto; passare a IndexedDB se items.json lo supera`.
- Ciclo nell'albero ricette: l'oggetto che chiude il ciclo è trattato come materiale e compare in `warnings`.

## Review Focus
1. Progressi salvati che citano oggetti spariti dopo una patch → scartati con avviso, mai crash (Task 2).
2. Primo avvio offline senza cache → messaggio chiaro, non pagina vuota (Task 3).
3. Ricetta con `yield` > 1 → numero di craft arrotondato per eccesso (Task 1).
4. Ricetta senza riga "Costs" o con più ricette alternative → `gold: 0` / si usa la prima, senza errore (Task 5).
5. Ingrediente con id assente in `items.json` o ciclo di ricette → warning, totali comunque calcolati (Task 1).

---

### Task 1: Repo, fixture e motore di calcolo

**Files:**
- Create: `index.html` (solo `<script id="core">` per ora), `tests/load-core.js`, `tests/calc.test.js`, `tests/fixtures/items.sample.json`, `.gitignore`
- Run: `git init -b main` in `C:\workspace\archeage-farm-tracker`

**Interfaces:**
- Produces (`<script id="core">`):
  - `type Craft = {profession:string, level:number, stations:string[], gold:number, yield?:number, ingredients:{id:string, qty:number}[]}`
  - `type Item = {name:string, category:string, rarity:string, type?:string, crafts:Craft[]}`
  - `computeNeeds(items:Record<string,Item>, targets:{id:string,qty:number}[], opts?:{expandIntermediates?:boolean}) -> {materials:Record<string,number>, steps:{id:string, times:number, craft:Craft}[], gold:number, warnings:string[]}`
  - `expandIntermediates` default `true`: gli oggetti con `crafts` non vuoto vengono espansi; con `false` restano in `materials` e non generano step (tranne gli obiettivi stessi).
  - Si usa sempre `crafts[0]`. `times = ceil(qtyNecessaria / (craft.yield ?? 1))`.
- `tests/load-core.js` esporta `loadCore() -> object`: legge `index.html`, estrae il testo tra `<script id="core">` e `</script>`, lo esegue con `vm.runInNewContext` e restituisce le funzioni dichiarate (il blocco termina con `Object.assign(globalThis.__core = {}, {computeNeeds, ...})`).

- [ ] **Step 1: Fixture** `tests/fixtures/items.sample.json` con: `hood` (Tailoring 1, stazione "Armor Workbench", gold 3000, 2×`textile` + 20×`rag` + 8×`mask`), `robe` (gold 3500, 3×`textile` + 30×`rag`), `textile` (Cloth 1, "Atelier", gold 100, 3×`fiber` + 5×`powder` + 5×`rag`), `loop-a`↔`loop-b` (si richiamano a vicenda), `bulk` (yield 5, 10×`rag`); `rag`, `mask`, `fiber`, `powder` grezzi (`crafts: []`, `type` "Raw Materials"/"Refined Materials").
- [ ] **Step 2: Test che falliscono** in `tests/calc.test.js` (`node:test`, `assert/strict`):
  - `hood x1` → `materials` = `{fiber:6, powder:10, rag:30, mask:8}`, `gold` = 3200, steps contengono `hood` (times 1) e `textile` (times 2).
  - `hood x1 + robe x1` → `fiber:15, powder:25, rag:75, mask:8`, `gold` = 7000 (textile condiviso sommato una volta sola).
  - `expandIntermediates:false` su `hood x1` → `textile:2` in `materials`, nessuno step per `textile`.
  - target grezzo (`rag x7`) → `materials` = `{rag:7}`, `steps` vuoto, `gold` 0.
  - **yield:** `bulk x6` → `times` 2 (ceil(6/5)), `rag` = 20.
  - **ciclo:** `loop-a x1` non lancia; `warnings` contiene una stringa che inizia con `cycle:` e `materials` non è vuoto.
  - **id sconosciuto:** target `{id:'ghost',qty:1}` e ingrediente mancante → `warnings` contiene `unknown:ghost`, nessuna eccezione.
- [ ] **Step 3:** `node --test tests/` → FAIL (`computeNeeds` non definita).
- [ ] **Step 4: Implementare** `computeNeeds` e `loadCore` come da Interfaces. Visita ricorsiva con insieme del percorso corrente per il ciclo; accumulo di quantità per id; `gold += craft.gold * times`.
- [ ] **Step 5:** `node --test tests/` → tutti PASS.
- [ ] **Step 6: Commit** `git add . && git commit -m "feat: recipe tree calculation core"` (include `docs/`).

---

### Task 2: Progressi (salvataggio, import/export, riconciliazione)

**Files:** Modify `index.html` (`<script id="core">`); Create `tests/progress.test.js`

**Interfaces:**
- Consumes: `Item`.
- Produces:
  - `type Progress = {v:1, targets:{id:string,qty:number}[], have:Record<string,number>, expandIntermediates:boolean}`
  - `emptyProgress() -> Progress`
  - `serializeProgress(p:Progress) -> string` (JSON)
  - `parseProgress(text:string) -> Progress | null` (null se JSON non valido, `v` ≠ 1 o campi di tipo sbagliato; quantità negative o non intere scartate)
  - `reconcile(p:Progress, items:Record<string,Item>) -> {progress:Progress, dropped:string[]}` rimuove da `targets` e `have` gli id non presenti in `items` e li elenca in `dropped`.

- [ ] **Step 1: Test che falliscono:** round trip `parseProgress(serializeProgress(p))` deep-equal `p`; `parseProgress('{bad')` → `null`; `parseProgress('{"v":2}')` → `null`; qty `-3` e `1.5` scartate; **`reconcile` con target `hood` e `old-sword` su items che contiene solo `hood`** → `dropped` = `['old-sword']`, target rimasto solo `hood`, `have` ripulito.
- [ ] **Step 2:** `node --test tests/progress.test.js` → FAIL.
- [ ] **Step 3: Implementare** le quattro funzioni in `core`.
- [ ] **Step 4:** `node --test tests/` → PASS.
- [ ] **Step 5: Commit** `feat: progress serialization and reconcile`.

---

### Task 3: Caricamento dati con cache e modalità offline

**Files:** Modify `index.html` (`core`); Create `tests/loader.test.js`

**Interfaces:**
- Produces: `async loadData(baseUrl:string, deps?:{fetchFn?:typeof fetch, storage?:Storage}) -> {items:Record<string,Item>, meta:{updatedAt:string,count:number,schema:number}, offline:boolean}`
  - Chiave cache `aa-farm-data-v1` = `{meta, items}`.
  - Scarica `meta.json`; se la cache ha lo stesso `updatedAt` la usa senza scaricare `items.json`; altrimenti scarica `items.json` e aggiorna la cache.
  - Se la rete fallisce e c'è cache → `offline:true`; se non c'è → lancia `Error` con `message` che inizia con `NO_DATA:` e contiene l'URL provato.
  - `baseUrl` sempre con `/` finale.

- [ ] **Step 1: Test che falliscono** con `fetchFn` e `storage` finti (oggetti in memoria): prima chiamata scarica entrambi i file e salva; seconda con stesso `updatedAt` chiama `fetchFn` una sola volta (solo meta); `updatedAt` nuovo → riscarica `items.json`; rete giù + cache → `offline:true` con gli stessi items; **rete giù senza cache → rifiuto con messaggio `NO_DATA:`**.
- [ ] **Step 2:** `node --test tests/loader.test.js` → FAIL.
- [ ] **Step 3: Implementare** `loadData`; storage opzionale difensivo (try/catch: se `localStorage` lancia, funziona senza cache).
- [ ] **Step 4:** `node --test tests/` → PASS.
- [ ] **Step 5: Commit** `feat: data loader with cache and offline mode`.

---

### Task 4: Interfaccia

**Files:** Modify `index.html` (markup, CSS, `<script id="ui">`); Create `tests/ui-checklist.md`

**Interfaces:**
- Consumes: `computeNeeds`, `loadData`, `emptyProgress`, `serializeProgress`, `parseProgress`, `reconcile` da `globalThis.__core`.
- Produces: pagina completa. Nessuna API nuova.

- [ ] **Step 1: Struttura:** costante `DATA_BASE_URL` in cima al file con le regole dei Global Constraints; header con data aggiornamento dati e badge "offline (dati del <data>)" quando `offline`; stato errore `NO_DATA` con messaggio e pulsante Riprova.
- [ ] **Step 2: Obiettivi:** campo di ricerca per nome (solo oggetti con `crafts` non vuoto e categoria ≠ `materials`, max 20 risultati), aggiunta con quantità, modifica e rimozione.
- [ ] **Step 3: Risultati:** interruttore "Intermedi: da craftare / da farmare"; lista materiali raggruppata per `type` con colonne necessari / posseduti (− campo +) / mancanti, barra di avanzamento complessiva, riga "Tutto raccolto" quando i mancanti sono 0; sezione "Passi di crafting" raggruppata per professione con livello, stazioni, volte; costo gold totale; elenco `warnings` se non vuoto; avviso con gli id `dropped` dopo `reconcile`.
- [ ] **Step 4: Persistenza:** salva `Progress` in `localStorage` a ogni modifica (try/catch); pulsanti Esporta (download `.json`) e Importa (file input → `parseProgress`, errore visibile se `null`).
- [ ] **Step 5: Stile:** variabili CSS per tema chiaro/scuro con `prefers-color-scheme`; footer con crediti e link a `https://metaforge.app/archeage-chronicles/database`.
- [ ] **Step 6: Verifica manuale** (scrivere i passi in `tests/ui-checklist.md`): `python -m http.server 8000` nella cartella, aprire `http://localhost:8000/?data=/tests/fixtures/` (servono `meta.json` e `items.json` nella fixture: aggiungerli copiando `items.sample.json` e `{"updatedAt":"2026-11-18T00:00:00Z","count":11,"schema":1}`). Atteso: cercando "hood" e aggiungendo ×1 compaiono `rag` 30, `fiber` 6, `powder` 10, `mask` 8 e gold 3.200; mettere `rag` a 30 porta i mancanti di `rag` a 0; ricaricare la pagina mantiene i valori; spegnere il server e ricaricare mostra il badge offline; aprire `index.html` da `file://` senza parametro carica da raw (404 finché non esistono dati: deve comparire lo stato `NO_DATA`, non una pagina vuota).
- [ ] **Step 7:** `node --test tests/` → PASS (i test del core non devono rompersi).
- [ ] **Step 8: Commit** `feat: farm tracker UI`.

---

### Task 5: Scraper — parser della pagina oggetto

**Files:** Create `scraper/package.json` (`type: module`, deps `playwright`, `cheerio`), `scraper/parse.mjs`, `scraper/browser.mjs`, `scraper/capture-fixtures.mjs`, `scraper/tests/parse.test.mjs`, `scraper/tests/fixtures/{cultist-hood,standard-textile,no-gold}.html`

**Interfaces:**
- Produces:
  - `parseItemPage(html:string, ctx:{slug:string, category:string}) -> {item:Item, refs:{id:string, category:string}[]}`
  - `refs` = ingredienti con categoria letta dall'`href` (`/archeage-chronicles/database/<categoria>/<slug>`): serve al crawler per seguire gli ingredienti ignoti.
  - `scraper/browser.mjs`: `withBrowser<T>(fn:(getHtml:(url:string)=>Promise<string>)=>Promise<T>) -> Promise<T>` (Chromium headless di Playwright, User-Agent `archeage-farm-tracker (github.com/jecko1989/archeagechronicles-farm-tracker)`, `getHtml` restituisce `page.content()` dopo il caricamento).
- Regole di parsing (dal testo reale osservato il 2026-11-18):
  - nome dall'`<h1>`; `rarity` dalla riga "Rarity"; `type` dalla riga "Type" o, se manca, "Armor Type" o la categoria.
  - sezione "How to Craft …": frase `Crafted at the <A> or <B> with <Profession> level <N>. Costs <G> Gold.` → `stations` (split su `" or "`), `profession`, `level`, `gold` (virgole tolte); senza `Costs` → `gold: 0`.
  - ingredienti: righe `N x <Nome>` con link; `id` = ultimo segmento dell'href.
  - se la sezione manca → `crafts: []`; se ci sono più blocchi ricetta, uno per blocco in ordine di pagina.

- [ ] **Step 1: Catturare le fixture** (una tantum, con rete): `npm --prefix scraper i && npx --prefix scraper playwright install chromium`, poi `node scraper/capture-fixtures.mjs` salva l'HTML di `/database/armor/cultist-hood`, `/database/materials/standard-textile` e di una pagina oggetto trovata dal builder senza riga "Costs" (se non esiste, editare a mano una copia di `cultist-hood.html` togliendo "Costs 3,000 Gold").
- [ ] **Step 2: Test che falliscono** (`node --test scraper/tests/`):
  - `cultist-hood` → `name 'Cultist Hood'`, `rarity 'Uncommon'`, `crafts[0]` = `{profession:'Tailoring', level:1, stations:['Armor Workbench','Light Armor Workbench'], gold:3000, ingredients:[{id:'standard-textile',qty:2},{id:'rag-scrap',qty:20},{id:'cultist-ritual-mask',qty:8}]}` e `refs` con le tre categorie.
  - `standard-textile` → `profession 'Cloth'`, `stations ['Atelier']`, `gold 100`, 3 ingredienti (3 `wild-fiber`, 5 `sweetgrass-powder`, 5 `rag-scrap`) — **una sola ricetta**, anche se il testo ripete "Atelier" quattro volte (sono icone).
  - `no-gold` → `crafts[0].gold === 0`.
  - pagina senza sezione "How to Craft" → `crafts: []`.
- [ ] **Step 3:** FAIL → **implementare** `parseItemPage` con cheerio (leggere le fixture per i selettori) e `withBrowser`.
- [ ] **Step 4:** `node --test scraper/tests/` → PASS.
- [ ] **Step 5: Commit** `feat(scraper): item page parser`.

---

### Task 6: Scraper — crawler, guardie e scrittura dati

**Files:** Create `scraper/crawl.mjs`, `scraper/validate.mjs`, `scraper/write.mjs`, `scraper/run.mjs`, `scraper/tests/validate.test.mjs`, `scraper/tests/write.test.mjs`

**Interfaces:**
- Consumes: `parseItemPage`, `withBrowser`.
- Produces:
  - `crawlAll(getHtml:(url:string)=>Promise<string>, opts?:{delayMs?:number}) -> Promise<Record<string,Item>>`: per ogni categoria `weapons, armor, accessories, bags, gliders, consumables, materials, tools` percorre `/database/<categoria>/page/N` finché una pagina non contiene link a oggetti (link `…/database/<categoria>/<slug>` senza `/page/`), apre ogni oggetto, poi segue i `refs` non ancora noti finché la coda è vuota. `delayMs` default 1000.
  - `validate(next:Record<string,Item>, prev:Record<string,Item>) -> string[]` (lista errori, vuota = ok): `count < 80%` di `prev` (solo se `prev` non è vuoto); `unknown-ingredient:<id>`; `empty-recipe:<id>`; `missing-profession:<id>`.
  - `writeData(dir:string, items:Record<string,Item>, now?:Date) -> {changed:boolean}`: scrive `items.json` ordinato; se il contenuto è identico a quello esistente non tocca né `items.json` né `meta.json`; altrimenti scrive anche `meta.json` `{updatedAt, count, schema:1}`.
  - `run.mjs`: legge `data/items.json` esistente (o `{}`), `crawlAll`, `validate`; se errori → li stampa e `process.exit(1)` senza scrivere; altrimenti `writeData('data', …)`.

- [ ] **Step 1: Test che falliscono:** `validate` — `prev` di 100 oggetti e `next` di 79 → errore di conteggio, 80 → ok; ingrediente `ghost` non presente → `unknown-ingredient:ghost`; ricetta con `ingredients: []` → `empty-recipe:<id>`; `prev` vuoto con `next` valido → `[]`. `writeData` in cartella temporanea — prima scrittura crea entrambi i file con chiavi ordinate; seconda scrittura con gli stessi items → `changed:false` e `meta.json` con `updatedAt` invariato; items diversi → `changed:true` e `updatedAt` nuovo.
- [ ] **Step 2:** `node --test scraper/tests/` → FAIL.
- [ ] **Step 3: Implementare** `validate`, `writeData`, `crawlAll` e `run.mjs`. `crawlAll` non ha test offline: si verifica allo Step 5.
- [ ] **Step 4:** `node --test scraper/tests/` → PASS.
- [ ] **Step 5: Run reale:** `node scraper/run.mjs` (≈ qualche centinaio di pagine, pochi minuti). Atteso: exit 0, `data/items.json` con `cultist-hood`, `standard-textile`, `rag-scrap` con `crafts: []`, nessun errore di guardia. Se una guardia fallisce, **non indebolirla**: leggere l'errore e correggere il parser o il crawler.
- [ ] **Step 6: Aprire la pagina** su `http://localhost:8000/?data=/data/` e ripetere il controllo del Task 4 con dati reali (Cultist Hood ×1: 20 `rag-scrap` + 5×2 dal textile = 30).
- [ ] **Step 7: Commit** `feat(scraper): crawler, guards and data writer` (incluso `data/`).

---

### Task 7: Action, README, pubblicazione

**Files:** Create `.github/workflows/scrape.yml`, `README.md`

**Interfaces:** nessuna nuova.

- [ ] **Step 1: Workflow** `scrape.yml`: trigger `schedule: cron "0 6 * * 1"` e `workflow_dispatch`; `permissions: contents: write`; passi checkout → `actions/setup-node@v4` con Node 20 → `npm --prefix scraper ci` (aggiungere il `package-lock.json` con `npm --prefix scraper i`) → `npx --prefix scraper playwright install --with-deps chromium` → `node scraper/run.mjs` → commit e push solo se `git diff --quiet -- data` indica modifiche (autore `github-actions[bot]`, messaggio `data: update from MetaForge`).
- [ ] **Step 2: README** in italiano: cos'è, link alla pagina (`https://jecko1989.github.io/archeagechronicles-farm-tracker/`), come usarla da file locale (scarica `index.html`), come rigenerare i dati (`node scraper/run.mjs`), **crediti a MetaForge** con link, nota "non affiliato agli sviluppatori del gioco", struttura dello schema `items.json`.
- [ ] **Step 3: CHECKPOINT con l'utente prima di pubblicare** (azione verso l'esterno): confermare che la repo sia **pubblica**, la **licenza** (default proposto: MIT per il codice; i dati restano di MetaForge/proprietari del gioco) e il testo dei crediti. Senza risposta non eseguire gli step successivi.
- [ ] **Step 4: Creare e pubblicare:** `gh repo create jecko1989/archeagechronicles-farm-tracker --public --source . --push` (`git init` è già stato fatto al Task 1).
- [ ] **Step 5: Attivare Pages** su `main` / root: `gh api -X POST repos/jecko1989/archeagechronicles-farm-tracker/pages -f "source[branch]=main" -f "source[path]=/"`.
- [ ] **Step 6: Verifica:** `gh workflow run scrape.yml` → `gh run watch` deve finire in successo e non creare commit (dati invariati); aprire l'URL di Pages e ripetere il controllo dei Task 4/6 con la pagina pubblicata (nessun `?data=`).
- [ ] **Step 7: Commit** delle eventuali correzioni e `git push`.

---

## Self-review
- **Copertura spec:** pagina unica (T1-4); dati da repo con cache/offline (T3); scraper con guardie e output deterministico (T5-6); Action settimanale + commit condizionale (T6 `writeData`, T7); progressi con export/import (T2, T4); crediti, data aggiornamento, tema (T4); aperto: ricette alternative gestite con "prima ricetta" (T1, T5); aperto dell'utente su pubblica/licenza/crediti → checkpoint T7.
- **Coerenza tipi:** `Item`, `Craft`, `Progress`, `computeNeeds`, `loadData`, `parseItemPage`, `validate`, `writeData` definiti una sola volta e usati con gli stessi nomi.
- **Proporzione:** i corpi di funzione non sono scritti; ogni step fissa firma, valori dello spec e asserzioni.
